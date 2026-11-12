import { describe, expect, it } from 'vitest';
import { addOpening } from '../src/core/model';
import { copyWalls, pasteFragment } from '../src/core/clipboard';
import { rectPlan } from './helpers';

describe('clipboard', () => {
  const plan = addOpening(addOpening(rectPlan(), 'w-001', 'door', 100), 'w-003', 'window', 500);

  it('copies the walls and the openings on them', () => {
    const f = copyWalls(plan, ['w-001', 'w-002', 'w-404']);
    expect(f.walls.map((w) => w.id)).toEqual(['w-001', 'w-002']);
    expect(f.openings.map((o) => o.id)).toEqual(['o-001']);
  });

  it('is a deep copy', () => {
    const f = copyWalls(plan, ['w-001']);
    f.walls[0].start.x = 99;
    f.openings[0].offset = 99;
    expect(plan.walls[0].start.x).toBe(0);
    expect(plan.openings[0].offset).toBe(100);
  });

  it('pastes with new ids, moved, and ties openings to the new walls', () => {
    const f = copyWalls(plan, ['w-001', 'w-002']);
    const r = pasteFragment(plan, f, 5000, 1000);
    expect(r.wallIds).toEqual(['w-005', 'w-006']);
    expect(r.openingIds).toEqual(['o-003']);
    expect(r.plan.walls[4]).toMatchObject({ id: 'w-005', start: { x: 5000, y: 1000 }, end: { x: 9000, y: 1000 } });
    expect(r.plan.openings[2]).toMatchObject({ id: 'o-003', wallId: 'w-005', offset: 100 });
    expect(plan.walls).toHaveLength(4);
  });

  it('can paste the same fragment twice', () => {
    const f = copyWalls(plan, ['w-001']);
    const once = pasteFragment(plan, f, 0, 5000);
    const twice = pasteFragment(once.plan, f, 0, 10000);
    expect(twice.wallIds).toEqual(['w-006']);
    expect(twice.plan.walls).toHaveLength(6);
  });

  it('skips openings whose wall is not in the fragment', () => {
    const f = { walls: [], openings: plan.openings };
    expect(pasteFragment(plan, f).plan).toEqual(plan);
  });
});
