import { describe, expect, it } from 'vitest';
import { addWall, emptyPlan } from '../src/core/model';
import { mergeMeshes, meshVolume, wallBox, wallFootprint } from '../src/core/walls-geometry';

const wallAt = (x1: number, y1: number, x2: number, y2: number) =>
  addWall(emptyPlan(), { x: x1, y: y1 }, { x: x2, y: y2 }, { thickness: 200, height: 2500 }).walls[0];

describe('walls-geometry', () => {
  it('footprint is the centre line widened by the thickness', () => {
    const f = wallFootprint(wallAt(0, 0, 4000, 0));
    expect(f.map((p) => [Math.round(p.x), Math.round(p.y)])).toEqual([
      [0, -100],
      [4000, -100],
      [4000, 100],
      [0, 100],
    ]);
  });

  it('a box has 24 vertices and 12 triangles', () => {
    const m = wallBox(wallAt(0, 0, 4000, 0));
    expect(m.positions).toHaveLength(24 * 3);
    expect(m.normals).toHaveLength(24 * 3);
    expect(m.indices).toHaveLength(36);
  });

  it('the box volume is length x thickness x height, whichever way the wall is drawn', () => {
    const expected = 4 * 0.2 * 2.5;
    expect(meshVolume(wallBox(wallAt(0, 0, 4000, 0)))).toBeCloseTo(expected, 6);
    expect(meshVolume(wallBox(wallAt(4000, 0, 0, 0)))).toBeCloseTo(expected, 6);
    expect(meshVolume(wallBox(wallAt(0, 0, 3000, 4000)))).toBeCloseTo(5 * 0.2 * 2.5, 6);
  });

  it('mergeMeshes shifts the indices of the second mesh', () => {
    const a = wallBox(wallAt(0, 0, 1000, 0));
    const b = wallBox(wallAt(0, 1000, 1000, 1000));
    const m = mergeMeshes([a, b]);
    expect(m.positions).toHaveLength(48 * 3);
    expect(m.indices[36]).toBe(24 + b.indices[0]);
  });
});
