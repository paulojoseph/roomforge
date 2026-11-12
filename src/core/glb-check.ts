// Structural checks on a .glb. Not a replacement for the Khronos validator,
// it only catches the mistakes this exporter could make.

const COMPONENT_SIZE: Record<number, number> = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const TYPE_COUNT: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };

interface Accessor {
  bufferView?: number;
  byteOffset?: number;
  componentType: number;
  count: number;
  type: string;
  min?: number[];
  max?: number[];
}

interface BufferView {
  buffer: number;
  byteOffset?: number;
  byteLength: number;
}

export function checkGlb(bytes: Uint8Array): string[] {
  const problems: string[] = [];
  if (bytes.length < 20) return ['file is shorter than a glb header'];
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (dv.getUint32(0, true) !== 0x46546c67) problems.push('bad magic');
  if (dv.getUint32(4, true) !== 2) problems.push('version is not 2');
  if (dv.getUint32(8, true) !== bytes.length) problems.push('header length does not match file length');

  const jsonLen = dv.getUint32(12, true);
  if (dv.getUint32(16, true) !== 0x4e4f534a) problems.push('first chunk is not JSON');
  if (jsonLen % 4 !== 0) problems.push('JSON chunk length is not a multiple of 4');
  if (20 + jsonLen > bytes.length) return [...problems, 'JSON chunk runs past the end of the file'];

  let json: Record<string, any>;
  try {
    json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLen)));
  } catch {
    return [...problems, 'JSON chunk does not parse'];
  }

  let binStart = -1;
  let binLen = 0;
  const next = 20 + jsonLen;
  if (next < bytes.length) {
    binLen = dv.getUint32(next, true);
    if (dv.getUint32(next + 4, true) !== 0x004e4942) problems.push('second chunk is not BIN');
    if (binLen % 4 !== 0) problems.push('BIN chunk length is not a multiple of 4');
    binStart = next + 8;
    if (binStart + binLen !== bytes.length) problems.push('BIN chunk does not end at the end of the file');
  }

  if (json.asset?.version !== '2.0') problems.push('asset.version is not 2.0');

  const buffers: { byteLength: number }[] = json.buffers ?? [];
  const views: BufferView[] = json.bufferViews ?? [];
  const accessors: Accessor[] = json.accessors ?? [];
  const meshes: any[] = json.meshes ?? [];
  const nodes: any[] = json.nodes ?? [];

  if (buffers.length > 0) {
    if (binStart < 0) problems.push('buffer declared but there is no BIN chunk');
    else if (buffers[0].byteLength > binLen || buffers[0].byteLength < binLen - 3) {
      problems.push('buffer byteLength does not match the BIN chunk');
    }
  }

  views.forEach((v, i) => {
    const off = v.byteOffset ?? 0;
    if (v.buffer !== 0 || !buffers[v.buffer]) problems.push(`bufferView ${i} refers to a missing buffer`);
    else if (off + v.byteLength > buffers[v.buffer].byteLength) problems.push(`bufferView ${i} runs past the end of its buffer`);
    if (off % 4 !== 0) problems.push(`bufferView ${i} offset is not aligned to 4`);
  });

  accessors.forEach((a, i) => {
    const comp = COMPONENT_SIZE[a.componentType];
    const n = TYPE_COUNT[a.type];
    if (!comp || !n) {
      problems.push(`accessor ${i} has an unknown type`);
      return;
    }
    const view = a.bufferView === undefined ? undefined : views[a.bufferView];
    if (!view) {
      problems.push(`accessor ${i} refers to a missing bufferView`);
      return;
    }
    if ((a.byteOffset ?? 0) + a.count * comp * n > view.byteLength) {
      problems.push(`accessor ${i} runs past the end of its bufferView`);
    }
  });

  meshes.forEach((m, mi) => {
    for (const prim of m.primitives ?? []) {
      const pos = accessors[prim.attributes?.POSITION];
      if (!pos) {
        problems.push(`mesh ${mi} has no POSITION accessor`);
        continue;
      }
      if (!pos.min || !pos.max) problems.push(`mesh ${mi} POSITION accessor has no min/max`);
      if (prim.indices !== undefined) {
        const ia = accessors[prim.indices];
        if (!ia) {
          problems.push(`mesh ${mi} refers to a missing index accessor`);
          continue;
        }
        if (ia.count % 3 !== 0) problems.push(`mesh ${mi} index count is not a multiple of 3`);
        if (binStart >= 0 && ia.componentType === 5123) {
          const view = views[ia.bufferView ?? -1];
          if (view) {
            const start = binStart + (view.byteOffset ?? 0) + (ia.byteOffset ?? 0);
            for (let k = 0; k < ia.count; k++) {
              if (dv.getUint16(start + k * 2, true) >= pos.count) {
                problems.push(`mesh ${mi} has an index past the last vertex`);
                break;
              }
            }
          }
        }
      }
      if (prim.material !== undefined && !(json.materials ?? [])[prim.material]) {
        problems.push(`mesh ${mi} refers to a missing material`);
      }
    }
  });

  nodes.forEach((n, i) => {
    if (n.mesh !== undefined && !meshes[n.mesh]) problems.push(`node ${i} refers to a missing mesh`);
  });
  for (const s of json.scenes ?? []) {
    for (const n of s.nodes ?? []) if (!nodes[n]) problems.push('scene refers to a missing node');
  }
  return problems;
}
