import type { Plan } from './model';
import { wallBox } from './walls-geometry';

// glTF constants
const FLOAT = 5126;
const USHORT = 5123;
const ARRAY_BUFFER = 34962;
const ELEMENT_ARRAY_BUFFER = 34963;

const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;

interface View {
  buffer: 0;
  byteOffset: number;
  byteLength: number;
  target: number;
}

/**
 * Binary glTF 2.0, metres, Y up. One node and one mesh per wall, each a
 * closed box. Openings are not part of the output.
 * Same plan in, same bytes out.
 */
export function exportGlb(plan: Plan): Uint8Array {
  const bin: Uint8Array[] = [];
  const views: View[] = [];
  const accessors: object[] = [];
  const meshes: object[] = [];
  const nodes: object[] = [];
  let offset = 0;

  const addView = (bytes: Uint8Array, target: number): number => {
    views.push({ buffer: 0, byteOffset: offset, byteLength: bytes.byteLength, target });
    bin.push(bytes);
    offset += bytes.byteLength;
    return views.length - 1;
  };

  const floats = (values: number[]): Uint8Array => {
    const out = new Uint8Array(values.length * 4);
    const dv = new DataView(out.buffer);
    values.forEach((v, i) => dv.setFloat32(i * 4, v, true));
    return out;
  };

  const shorts = (values: number[]): Uint8Array => {
    const out = new Uint8Array(values.length * 2);
    const dv = new DataView(out.buffer);
    values.forEach((v, i) => dv.setUint16(i * 2, v, true));
    return out;
  };

  // TODO: 24 vertices per wall is wasteful, share the corners once the walls are joined
  for (const w of plan.walls) {
    const m = wallBox(w);
    const count = m.positions.length / 3;

    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < m.positions.length; i++) {
      const v = Math.fround(m.positions[i]);
      const c = i % 3;
      if (v < min[c]) min[c] = v;
      if (v > max[c]) max[c] = v;
    }

    const posView = addView(floats(m.positions), ARRAY_BUFFER);
    const nrmView = addView(floats(m.normals), ARRAY_BUFFER);
    const idxView = addView(shorts(m.indices), ELEMENT_ARRAY_BUFFER);

    const base = accessors.length;
    accessors.push({ bufferView: posView, componentType: FLOAT, count, type: 'VEC3', min, max });
    accessors.push({ bufferView: nrmView, componentType: FLOAT, count, type: 'VEC3' });
    accessors.push({ bufferView: idxView, componentType: USHORT, count: m.indices.length, type: 'SCALAR' });

    meshes.push({
      name: w.id,
      primitives: [{ attributes: { POSITION: base, NORMAL: base + 1 }, indices: base + 2, material: 0 }],
    });
    nodes.push({ name: w.id, mesh: meshes.length - 1 });
  }

  const json: Record<string, unknown> = {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ name: plan.meta.name, nodes: nodes.map((_, i) => i) }],
    nodes,
  };
  if (plan.walls.length > 0) {
    json.meshes = meshes;
    json.materials = [
      { name: 'wall', pbrMetallicRoughness: { baseColorFactor: [0.82, 0.8, 0.76, 1], metallicFactor: 0, roughnessFactor: 0.9 } },
    ];
    json.accessors = accessors;
    json.bufferViews = views;
    json.buffers = [{ byteLength: offset }];
  }

  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonPad = (4 - (jsonBytes.length % 4)) % 4;
  const jsonLen = jsonBytes.length + jsonPad;
  const binLen = offset;

  const total = 12 + 8 + jsonLen + (binLen > 0 ? 8 + binLen : 0);
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546c67, true); // "glTF"
  dv.setUint32(4, 2, true);
  dv.setUint32(8, total, true);

  dv.setUint32(12, jsonLen, true);
  dv.setUint32(16, CHUNK_JSON, true);
  out.set(jsonBytes, 20);
  out.fill(0x20, 20 + jsonBytes.length, 20 + jsonLen);

  if (binLen > 0) {
    let p = 20 + jsonLen;
    dv.setUint32(p, binLen, true);
    dv.setUint32(p + 4, CHUNK_BIN, true);
    p += 8;
    for (const b of bin) {
      out.set(b, p);
      p += b.byteLength;
    }
  }
  return out;
}
