import type { Point, Wall } from './model';
import { leftNormal, unit } from './geometry';

/**
 * Plain arrays, no three.js types: this runs in a worker and in Node.
 * World space: metres, Y up. Plan (x, y) becomes (x / 1000, height, -y / 1000),
 * so the plan seen from above looks the same as the 2D drawing.
 */
export interface MeshData {
  positions: number[];
  normals: number[];
  indices: number[];
}

export function planToWorld(p: Point, heightMm = 0): [number, number, number] {
  return [p.x / 1000, heightMm / 1000, -p.y / 1000];
}

/**
 * Footprint of a wall: the four corners of the rectangle around its centre
 * line, counter clockwise (start-right, end-right, end-left, start-left).
 */
export function wallFootprint(w: Wall): [Point, Point, Point, Point] {
  const d = unit(w.start, w.end);
  const n = leftNormal(d);
  const h = w.thickness / 2;
  return [
    { x: w.start.x - n.x * h, y: w.start.y - n.y * h },
    { x: w.end.x - n.x * h, y: w.end.y - n.y * h },
    { x: w.end.x + n.x * h, y: w.end.y + n.y * h },
    { x: w.start.x + n.x * h, y: w.start.y + n.y * h },
  ];
}

/** One closed box for a wall: 24 vertices, 12 triangles. */
export function wallBox(w: Wall): MeshData {
  const f = wallFootprint(w);
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  const quad = (a: number[], b: number[], c: number[], d: number[], nrm: number[]) => {
    const base = positions.length / 3;
    for (const v of [a, b, c, d]) {
      positions.push(v[0], v[1], v[2]);
      normals.push(nrm[0], nrm[1], nrm[2]);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  const bot = f.map((p) => planToWorld(p, 0));
  const top = f.map((p) => planToWorld(p, w.height));

  // top and bottom
  quad(top[0], top[1], top[2], top[3], [0, 1, 0]);
  quad(bot[0], bot[3], bot[2], bot[1], [0, -1, 0]);

  // sides: outward normal is the right-hand side of each footprint edge
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const e = unit(f[i], f[j]);
    quad(bot[i], bot[j], top[j], top[i], [e.y, 0, e.x]);
  }
  return { positions, normals, indices };
}

/** Appends meshes into one, fixing up the indices. */
export function mergeMeshes(list: MeshData[]): MeshData {
  const out: MeshData = { positions: [], normals: [], indices: [] };
  for (const m of list) {
    const base = out.positions.length / 3;
    for (const v of m.positions) out.positions.push(v);
    for (const v of m.normals) out.normals.push(v);
    for (const i of m.indices) out.indices.push(i + base);
  }
  return out;
}

/** Signed volume of a closed mesh in cubic metres (positive when wound outwards). */
export function meshVolume(m: MeshData): number {
  let v = 0;
  const p = m.positions;
  for (let t = 0; t < m.indices.length; t += 3) {
    const a = m.indices[t] * 3;
    const b = m.indices[t + 1] * 3;
    const c = m.indices[t + 2] * 3;
    const ax = p[a], ay = p[a + 1], az = p[a + 2];
    const bx = p[b], by = p[b + 1], bz = p[b + 2];
    const cx = p[c], cy = p[c + 1], cz = p[c + 2];
    v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  return v;
}
