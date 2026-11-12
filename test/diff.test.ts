import { describe, expect, it } from 'vitest';
import { addOpening, addWall, removeWall, renamePlan, updateWall } from '../src/core/model';
import { countChanges, describeDiff, diffPlans, isEmptyDiff } from '../src/core/diff';
import { rectPlan } from './helpers';

describe('diffPlans', () => {
  it('finds nothing between a plan and itself or a copy', () => {
    const p = addOpening(rectPlan(), 'w-001', 'door', 100);
    expect(isEmptyDiff(diffPlans(p, p))).toBe(true);
    expect(isEmptyDiff(diffPlans(p, JSON.parse(JSON.stringify(p))))).toBe(true);
    expect(describeDiff(diffPlans(p, p))).toEqual([]);
  });

  it('sees an added and a removed wall', () => {
    const base = rectPlan();
    const grown = addWall(base, { x: 0, y: 1500 }, { x: 4000, y: 1500 });
    const d = diffPlans(base, grown);
    expect(d.walls.added.map((w) => w.id)).toEqual(['w-005']);
    expect(diffPlans(grown, base).walls.removed.map((w) => w.id)).toEqual(['w-005']);
  });

  it('sees a changed wall with before and after', () => {
    const base = rectPlan();
    const d = diffPlans(base, updateWall(base, 'w-002', { thickness: 200 }));
    expect(d.walls.changed).toHaveLength(1);
    expect(d.walls.changed[0].before.thickness).toBe(150);
    expect(d.walls.changed[0].after.thickness).toBe(200);
  });

  it('sees openings come, go and move', () => {
    const base = addOpening(rectPlan(), 'w-001', 'door', 100);
    const moved = { ...base, openings: base.openings.map((o) => ({ ...o, offset: 200 })) };
    expect(diffPlans(base, moved).openings.changed).toHaveLength(1);
    expect(diffPlans(base, removeWall(base, 'w-001')).openings.removed.map((o) => o.id)).toEqual(['o-001']);
    expect(diffPlans(rectPlan(), base).openings.added).toHaveLength(1);
  });

  it('notices the name and the units', () => {
    const base = rectPlan();
    const d = diffPlans(base, { ...renamePlan(base, 'other'), meta: { name: 'other', units: 'm' } });
    expect(d.meta).toEqual(['name: rect -> other', 'units: mm -> m']);
    expect(isEmptyDiff(d)).toBe(false);
  });

  it('does not care about the order of the walls', () => {
    const base = rectPlan();
    const swapped = { ...base, walls: [...base.walls].reverse() };
    expect(isEmptyDiff(diffPlans(base, swapped))).toBe(true);
  });
});

describe('describeDiff', () => {
  it('writes one line per kind', () => {
    const base = addOpening(rectPlan(), 'w-001', 'door', 100);
    let next = updateWall(base, 'w-001', { height: 3000 });
    next = removeWall(next, 'w-003'); // not the last id, so the new wall below gets w-005
    next = addWall(next, { x: 0, y: 1500 }, { x: 4000, y: 1500 });
    const d = diffPlans(base, next);
    expect(describeDiff(d)).toEqual(['walls: 1 added, 1 removed, 1 changed']);
    expect(countChanges(d)).toBe('3 changes');
    expect(countChanges(diffPlans(base, base))).toBe('0 changes');
    expect(countChanges(diffPlans(base, updateWall(base, 'w-001', { height: 1 })))).toBe('1 change');
  });
});
