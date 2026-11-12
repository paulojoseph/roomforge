import { describe, expect, it } from 'vitest';
import { addWall, emptyPlan } from '../src/core/model';
import { boxCentre, boxContains, boxGrow, boxSize, boxUnion, planExtent, wallExtent, zoomToFit } from '../src/core/bounds';
import { rectPlan } from './helpers';

describe('extent', () => {
  it('includes the thickness of the walls', () => {
    const e = planExtent(rectPlan());
    expect(e).toEqual({ min: { x: -75, y: -75 }, max: { x: 4075, y: 3075 } });
  });

  it('is null for an empty plan', () => {
    expect(planExtent(emptyPlan())).toBeNull();
  });

  it('boxes a single wall', () => {
    const p = rectPlan();
    expect(wallExtent(p.walls[0])).toEqual({ min: { x: 0, y: -75 }, max: { x: 4000, y: 75 } });
  });

  it('works for a diagonal wall', () => {
    const p = addWall(emptyPlan(), { x: 0, y: 0 }, { x: 1000, y: 1000 }, { thickness: 100 });
    const e = wallExtent(p.walls[0]);
    // 50 mm either side, at 45 degrees that is about 35 mm on each axis
    expect(e.min.x).toBeCloseTo(-35.36, 1);
    expect(e.max.y).toBeCloseTo(1035.36, 1);
  });
});

describe('box helpers', () => {
  const a = { min: { x: 0, y: 0 }, max: { x: 10, y: 20 } };
  const b = { min: { x: -5, y: 5 }, max: { x: 4, y: 30 } };

  it('measures', () => {
    expect(boxSize(a)).toEqual({ width: 10, height: 20 });
    expect(boxCentre(a)).toEqual({ x: 5, y: 10 });
  });

  it('contains points on the edge', () => {
    expect(boxContains(a, { x: 10, y: 0 })).toBe(true);
    expect(boxContains(a, { x: 11, y: 0 })).toBe(false);
  });

  it('unions and grows', () => {
    expect(boxUnion(a, b)).toEqual({ min: { x: -5, y: 0 }, max: { x: 10, y: 30 } });
    expect(boxGrow(a, 2)).toEqual({ min: { x: -2, y: -2 }, max: { x: 12, y: 22 } });
    expect(boxGrow(a, -2)).toEqual({ min: { x: 2, y: 2 }, max: { x: 8, y: 18 } });
  });
});

describe('zoomToFit', () => {
  const box = { min: { x: 0, y: 0 }, max: { x: 10000, y: 10000 } };

  it('is 1 when one pixel is ten millimetres', () => {
    expect(zoomToFit(box, { width: 1000, height: 1000 }, 0)).toBeCloseTo(1, 10);
  });

  it('is limited by the tighter side', () => {
    expect(zoomToFit(box, { width: 2000, height: 500 }, 0)).toBeCloseTo(0.5, 10);
  });

  it('keeps a margin', () => {
    expect(zoomToFit(box, { width: 1100, height: 1100 }, 50)).toBeCloseTo(1, 10);
  });

  it('stays inside the zoom limits', () => {
    const tiny = { min: { x: 0, y: 0 }, max: { x: 100, y: 100 } };
    expect(zoomToFit(tiny, { width: 1000, height: 1000 }, 0)).toBe(16);
    expect(zoomToFit(box, { width: 50, height: 50 }, 0)).toBe(0.1);
  });

  it('fits a straight wall by its long side and survives a point', () => {
    const line = { min: { x: 0, y: 0 }, max: { x: 5000, y: 0 } };
    expect(zoomToFit(line, { width: 500, height: 500 }, 0)).toBeCloseTo(1, 10);
    const dot = { min: { x: 1, y: 1 }, max: { x: 1, y: 1 } };
    expect(zoomToFit(dot, { width: 500, height: 500 })).toBe(1);
  });
});
