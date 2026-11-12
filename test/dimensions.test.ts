import { describe, expect, it } from 'vitest';
import { addOpening, addWall, emptyPlan } from '../src/core/model';
import { openingDimensions, wallChain, wallDimensions } from '../src/core/dimensions';
import { rectPlan } from './helpers';

describe('wallDimensions', () => {
  const dims = wallDimensions(rectPlan());

  it('puts a line beside every wall, a half thickness plus the gap away', () => {
    expect(dims).toHaveLength(4);
    expect(dims[0]).toMatchObject({
      wallId: 'w-001',
      a: { x: 0, y: 0 },
      b: { x: 4000, y: 0 },
      from: { x: 0, y: 375 },
      to: { x: 4000, y: 375 },
      label: { x: 2000, y: 375 },
      value: 4000,
    });
    // left of start -> end is the inside of a counter clockwise loop
    expect(dims[1].from).toEqual({ x: 3625, y: 0 });
    expect(dims[2].from).toEqual({ x: 4000, y: 2625 });
  });

  it('keeps the text upright', () => {
    expect(dims.map((d) => d.angle)).toEqual([0, 90, 0, 90]);
    for (const d of dims) {
      expect(d.angle).toBeGreaterThan(-90);
      expect(d.angle).toBeLessThanOrEqual(90);
    }
  });

  it('can go to the other side and use another gap', () => {
    const d = wallDimensions(rectPlan(), { side: -1, gap: 100 })[0];
    expect(d.from).toEqual({ x: 0, y: -175 });
  });

  it('skips zero length walls', () => {
    const p = addWall(emptyPlan(), { x: 5, y: 5 }, { x: 5, y: 5 });
    expect(wallDimensions(p)).toEqual([]);
  });
});

describe('openingDimensions', () => {
  it('measures the width, on the other side of the wall', () => {
    const p = addOpening(rectPlan(), 'w-001', 'door', 100);
    const [d] = openingDimensions(p);
    expect(d).toMatchObject({ openingId: 'o-001', wallId: 'w-001', value: 900, from: { x: 100, y: -375 }, to: { x: 1000, y: -375 } });
  });

  it('ignores openings on walls that are not there', () => {
    expect(openingDimensions(addOpening(rectPlan(), 'w-404', 'door', 0))).toEqual([]);
  });
});

describe('wallChain', () => {
  it('adds up to the wall length, whatever order the openings were added in', () => {
    let p = addOpening(rectPlan(), 'w-001', 'window', 2000); // 1200 wide
    p = addOpening(p, 'w-001', 'door', 100); // 900 wide
    const chain = wallChain(p, 'w-001');
    expect(chain).toEqual([
      { label: 'wall', value: 100 },
      { label: 'o-002', value: 900 },
      { label: 'wall', value: 1000 },
      { label: 'o-001', value: 1200 },
      { label: 'wall', value: 800 },
    ]);
    expect(chain.reduce((s, c) => s + c.value, 0)).toBe(4000);
  });

  it('is one piece for a bare wall and empty for an unknown one', () => {
    expect(wallChain(rectPlan(), 'w-002')).toEqual([{ label: 'wall', value: 3000 }]);
    expect(wallChain(rectPlan(), 'nope')).toEqual([]);
  });
});
