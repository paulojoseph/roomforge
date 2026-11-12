import { describe, expect, it } from 'vitest';
import { addWall, emptyPlan } from '../src/core/model';
import { nearestEndpoint, snap } from '../src/core/snap';

const plan = addWall(emptyPlan(), { x: 1000, y: 1000 }, { x: 3000, y: 1000 });

describe('snap', () => {
  it('rounds to the grid', () => {
    const r = snap({ x: 1234, y: 987 }, plan, { modes: ['grid'] });
    expect(r).toEqual({ point: { x: 1200, y: 1000 }, mode: 'grid' });
  });

  it('rounds negative coordinates to the grid too', () => {
    const r = snap({ x: -149, y: -151 }, emptyPlan(), { modes: ['grid'] });
    expect(r.point).toEqual({ x: -100, y: -200 });
  });

  it('endpoint wins over grid at 150 mm', () => {
    // same as the old editor
    const r = snap({ x: 1150, y: 1000 }, plan);
    expect(r).toEqual({ point: { x: 1000, y: 1000 }, mode: 'endpoint' });
  });

  it('falls back to the grid when no endpoint is close', () => {
    const r = snap({ x: 1400, y: 1000 }, plan);
    expect(r).toEqual({ point: { x: 1400, y: 1000 }, mode: 'grid' });
  });

  it('picks the nearest of two endpoints', () => {
    const r = snap({ x: 2900, y: 1040 }, plan);
    expect(r.point).toEqual({ x: 3000, y: 1000 });
  });

  it('comes back unchanged when no requested mode hits', () => {
    const r = snap({ x: 1400, y: 1000 }, plan, { modes: ['endpoint'] });
    expect(r).toEqual({ point: { x: 1400, y: 1000 }, mode: 'none' });
  });

  it('nearestEndpoint returns a copy, not the wall point', () => {
    const e = nearestEndpoint({ x: 1010, y: 1000 }, plan, 100);
    expect(e).toEqual({ x: 1000, y: 1000 });
    expect(e).not.toBe(plan.walls[0].start);
  });
});
