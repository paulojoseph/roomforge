import { describe, expect, it } from 'vitest';
import { addOpening, addWall, emptyPlan, findWall } from '../src/core/model';
import { flipWall, mergeWalls, moveOpening, moveWall, resizeOpening, splitWall } from '../src/core/edit';
import { rectPlan } from './helpers';

/** w-001 is 4000 long: a door at 50..950, a window at 1500..2700 and a wide one at 800..1200. */
function busy() {
  let p = rectPlan();
  p = addOpening(p, 'w-001', 'door', 50); // o-001
  p = addOpening(p, 'w-001', 'window', 1500); // o-002
  p = addOpening(p, 'w-001', 'window', 800, { width: 400 }); // o-003, crosses a cut at 1000
  return p;
}

describe('splitWall', () => {
  it('cuts the wall and sends the openings to the right half', () => {
    const r = splitWall(busy(), 'w-001', 1000);
    expect(r).not.toBeNull();
    const { plan, firstId, secondId, dropped } = r!;
    expect(firstId).toBe('w-001');
    expect(secondId).toBe('w-005');
    expect(findWall(plan, 'w-001')!.end).toEqual({ x: 1000, y: 0 });
    expect(findWall(plan, 'w-005')).toMatchObject({ start: { x: 1000, y: 0 }, end: { x: 4000, y: 0 }, thickness: 150 });
    expect(dropped).toEqual(['o-003']);
    expect(plan.openings.map((o) => [o.id, o.wallId, o.offset])).toEqual([
      ['o-001', 'w-001', 50],
      ['o-002', 'w-005', 500],
    ]);
  });

  it('puts the new wall right after the old one', () => {
    const r = splitWall(rectPlan(), 'w-001', 1000)!;
    expect(r.plan.walls.map((w) => w.id)).toEqual(['w-001', 'w-005', 'w-002', 'w-003', 'w-004']);
  });

  it('refuses a cut at or outside the ends, and unknown walls', () => {
    const p = rectPlan();
    expect(splitWall(p, 'w-001', 0)).toBeNull();
    expect(splitWall(p, 'w-001', 4000)).toBeNull();
    expect(splitWall(p, 'w-001', 5000)).toBeNull();
    expect(splitWall(p, 'w-404', 100)).toBeNull();
  });

  it('works on a wall that runs right to left', () => {
    const p = addWall(emptyPlan(), { x: 4000, y: 0 }, { x: 0, y: 0 });
    const r = splitWall(p, 'w-001', 1000)!;
    expect(r.plan.walls[0].end).toEqual({ x: 3000, y: 0 });
    expect(r.plan.walls[1].start).toEqual({ x: 3000, y: 0 });
  });
});

describe('flipWall', () => {
  it('swaps the ends and mirrors the offsets', () => {
    const p = flipWall(addOpening(rectPlan(), 'w-001', 'door', 100), 'w-001')!;
    expect(p.walls[0].start).toEqual({ x: 4000, y: 0 });
    expect(p.walls[0].end).toEqual({ x: 0, y: 0 });
    expect(p.openings[0].offset).toBe(3000);
  });

  it('twice gives the plan back', () => {
    const p = busy();
    expect(flipWall(flipWall(p, 'w-001')!, 'w-001')).toEqual(p);
  });

  it('returns null for an unknown wall', () => {
    expect(flipWall(rectPlan(), 'nope')).toBeNull();
  });
});

describe('mergeWalls', () => {
  it('undoes a split', () => {
    const p = addOpening(rectPlan(), 'w-001', 'window', 2000);
    const cut = splitWall(p, 'w-001', 1000)!.plan;
    expect(mergeWalls(cut, 'w-001', 'w-005')).toEqual(p);
  });

  it('does not care which wall is named first: the one that comes first along the line keeps its id', () => {
    const cut = splitWall(rectPlan(), 'w-001', 1000)!.plan;
    const m = mergeWalls(cut, 'w-005', 'w-001')!;
    expect(m.walls).toHaveLength(4);
    expect(findWall(m, 'w-001')).toMatchObject({ start: { x: 0, y: 0 }, end: { x: 4000, y: 0 } });
    expect(findWall(m, 'w-005')).toBeUndefined();
  });

  it('handles a wall drawn the other way round', () => {
    let cut = splitWall(addOpening(rectPlan(), 'w-001', 'door', 3000), 'w-001', 1000)!.plan;
    cut = flipWall(cut, 'w-005')!;
    const m = mergeWalls(cut, 'w-001', 'w-005')!;
    expect(m.walls[0]).toMatchObject({ id: 'w-001', end: { x: 4000, y: 0 } });
    expect(m.openings[0]).toMatchObject({ wallId: 'w-001', offset: 3000 });
  });

  it('refuses walls that are not in line, do not touch, or differ in section', () => {
    const p = rectPlan();
    expect(mergeWalls(p, 'w-001', 'w-002')).toBeNull(); // corner
    expect(mergeWalls(p, 'w-001', 'w-003')).toBeNull(); // do not touch
    expect(mergeWalls(p, 'w-001', 'w-001')).toBeNull();
    expect(mergeWalls(p, 'w-001', 'w-404')).toBeNull();
    const cut = splitWall(p, 'w-001', 1000)!.plan;
    const thick = { ...cut, walls: cut.walls.map((w) => (w.id === 'w-005' ? { ...w, thickness: 200 } : w)) };
    expect(mergeWalls(thick, 'w-001', 'w-005')).toBeNull();
  });

  it('refuses a wall that folds back over the first one', () => {
    let p = addWall(emptyPlan(), { x: 0, y: 0 }, { x: 2000, y: 0 });
    p = addWall(p, { x: 2000, y: 0 }, { x: 1000, y: 0 });
    expect(mergeWalls(p, 'w-001', 'w-002')).toBeNull();
  });
});

describe('moving things', () => {
  it('moveWall shifts both ends and leaves the neighbours behind', () => {
    const p = moveWall(rectPlan(), 'w-001', 0, 500)!;
    expect(p.walls[0].start).toEqual({ x: 0, y: 500 });
    expect(p.walls[0].end).toEqual({ x: 4000, y: 500 });
    expect(p.walls[1].start).toEqual({ x: 4000, y: 0 });
    expect(moveWall(rectPlan(), 'nope', 1, 1)).toBeNull();
  });

  it('moveOpening keeps the opening inside the wall', () => {
    const p = addOpening(rectPlan(), 'w-001', 'door', 100);
    expect(moveOpening(p, 'o-001', 5000)!.openings[0].offset).toBe(3100);
    expect(moveOpening(p, 'o-001', -5)!.openings[0].offset).toBe(0);
    expect(moveOpening(p, 'o-001', 1234.6)!.openings[0].offset).toBe(1235);
    expect(moveOpening(p, 'o-404', 1)).toBeNull();
  });

  it('resizeOpening keeps the near edge and the limits', () => {
    const p = addOpening(rectPlan(), 'w-001', 'door', 3000);
    expect(resizeOpening(p, 'o-001', 600)!.openings[0]).toMatchObject({ offset: 3000, width: 600 });
    expect(resizeOpening(p, 'o-001', 1500)!.openings[0]).toMatchObject({ offset: 2500, width: 1500 });
    expect(resizeOpening(p, 'o-001', 50)!.openings[0].width).toBe(300);
    expect(resizeOpening(p, 'o-001', 9000)!.openings[0]).toMatchObject({ offset: 0, width: 4000 });
  });
});
