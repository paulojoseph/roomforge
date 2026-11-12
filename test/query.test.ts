import { describe, expect, it } from 'vitest';
import { addOpening, addWall, emptyPlan, removeWall } from '../src/core/model';
import {
  connectedGroups,
  danglingEnds,
  distanceToWall,
  findCrossings,
  intersectSegments,
  openingAt,
  wallAt,
  wallsTouching,
} from '../src/core/query';
import { rectPlan } from './helpers';

describe('wallAt', () => {
  const p = rectPlan();

  it('finds the wall under a point, thickness included', () => {
    expect(wallAt(p, { x: 2000, y: 50 })?.id).toBe('w-001');
    expect(wallAt(p, { x: 2000, y: 75 })?.id).toBe('w-001');
    expect(wallAt(p, { x: 2000, y: 100 })).toBeNull();
  });

  it('widens the hit area with a tolerance', () => {
    expect(wallAt(p, { x: 2000, y: 100 }, 30)?.id).toBe('w-001');
  });

  it('picks the nearest wall at a corner', () => {
    expect(wallAt(p, { x: 4000, y: 40 })?.id).toBe('w-002');
    expect(wallAt(p, { x: 3960, y: 0 })?.id).toBe('w-001');
  });

  it('measures to the centre line', () => {
    expect(distanceToWall({ x: 5000, y: 0 }, p.walls[0])).toBe(1000);
  });
});

describe('openingAt', () => {
  const p = addOpening(rectPlan(), 'w-001', 'door', 100); // centre at x = 550

  it('finds the opening near a point', () => {
    expect(openingAt(p, { x: 560, y: 10 })?.id).toBe('o-001');
  });

  it('gives null when nothing is close', () => {
    expect(openingAt(p, { x: 2000, y: 0 })).toBeNull();
    expect(openingAt(p, { x: 560, y: 400 })).toBeNull();
  });
});

describe('intersectSegments', () => {
  it('finds the point where two segments cross', () => {
    const hit = intersectSegments({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 });
    expect(hit).toEqual({ point: { x: 5, y: 5 }, t: 0.5, u: 0.5 });
  });

  it('gives null for parallel and for short segments', () => {
    expect(intersectSegments({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 5 }, { x: 10, y: 5 })).toBeNull();
    expect(intersectSegments({ x: 0, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 10 }, { x: 10, y: 0 })).toBeNull();
  });

  it('reports a touching end as t = 0 or 1', () => {
    const hit = intersectSegments({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 });
    expect(hit?.t).toBe(1);
    expect(hit?.u).toBe(0);
  });
});

describe('findCrossings', () => {
  it('lists nothing for a closed rectangle: shared corners are not crossings', () => {
    expect(findCrossings(rectPlan())).toEqual([]);
  });

  it('finds a cross', () => {
    let p = addWall(emptyPlan(), { x: 0, y: 2000 }, { x: 4000, y: 2000 });
    p = addWall(p, { x: 2000, y: 0 }, { x: 2000, y: 4000 });
    expect(findCrossings(p)).toEqual([{ a: 'w-001', b: 'w-002', at: { x: 2000, y: 2000 }, kind: 'cross' }]);
  });

  it('finds a tee', () => {
    let p = addWall(emptyPlan(), { x: 0, y: 0 }, { x: 4000, y: 0 });
    p = addWall(p, { x: 2000, y: 0 }, { x: 2000, y: 3000 });
    expect(findCrossings(p)).toEqual([{ a: 'w-001', b: 'w-002', at: { x: 2000, y: 0 }, kind: 'tee' }]);
  });
});

describe('connections', () => {
  it('wallsTouching lists the walls that share an end', () => {
    expect(wallsTouching(rectPlan(), 'w-001')).toEqual(['w-002', 'w-004']);
    expect(wallsTouching(rectPlan(), 'nope')).toEqual([]);
  });

  it('connectedGroups separates loose walls', () => {
    const p = addWall(rectPlan(), { x: 9000, y: 9000 }, { x: 9500, y: 9000 });
    expect(connectedGroups(p)).toEqual([['w-001', 'w-002', 'w-003', 'w-004'], ['w-005']]);
  });

  it('danglingEnds is empty for a closed loop and lists the open ends otherwise', () => {
    expect(danglingEnds(rectPlan())).toEqual([]);
    const open = removeWall(rectPlan(), 'w-004');
    expect(danglingEnds(open)).toEqual([
      { wallId: 'w-001', end: 'start', point: { x: 0, y: 0 } },
      { wallId: 'w-003', end: 'end', point: { x: 0, y: 3000 } },
    ]);
  });
});
