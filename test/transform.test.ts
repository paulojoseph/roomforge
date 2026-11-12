import { describe, expect, it } from 'vitest';
import { addOpening, planBounds } from '../src/core/model';
import { mirrorPlan, moveToOrigin, rotatePlan, scalePlan, translatePlan } from '../src/core/transform';
import { wallLength } from '../src/core/model';
import { rectPlan } from './helpers';

describe('translatePlan', () => {
  it('moves every end', () => {
    const p = translatePlan(rectPlan(), 1000, -500);
    expect(p.walls[0].start).toEqual({ x: 1000, y: -500 });
    expect(p.walls[2].end).toEqual({ x: 1000, y: 2500 });
  });

  it('returns the same object for no movement', () => {
    const p = rectPlan();
    expect(translatePlan(p, 0, 0)).toBe(p);
    expect(translatePlan(p, 0.2, -0.4)).toBe(p);
  });

  it('does not touch the input', () => {
    const p = rectPlan();
    translatePlan(p, 10, 10);
    expect(p.walls[0].start).toEqual({ x: 0, y: 0 });
  });
});

describe('moveToOrigin', () => {
  it('puts the lower left centre line corner at 0, 0', () => {
    const p = moveToOrigin(translatePlan(rectPlan(), 7000, 9000));
    expect(planBounds(p)).toEqual({ min: { x: 0, y: 0 }, max: { x: 4000, y: 3000 } });
  });
});

describe('rotatePlan', () => {
  it('turns 90 degrees counter clockwise, exactly', () => {
    const p = rotatePlan(rectPlan(), 90);
    expect(p.walls[0].end).toEqual({ x: 0, y: 4000 });
    expect(p.walls[1].end).toEqual({ x: -3000, y: 4000 });
  });

  it('four quarter turns are the identity, and -90 is 270', () => {
    let p = rectPlan();
    for (let i = 0; i < 4; i++) p = rotatePlan(p, 90);
    expect(p).toEqual(rectPlan());
    expect(rotatePlan(rectPlan(), -90)).toEqual(rotatePlan(rectPlan(), 270));
  });

  it('turns around another point', () => {
    const p = rotatePlan(rectPlan(), 180, { x: 2000, y: 1500 });
    expect(p.walls[0].start).toEqual({ x: 4000, y: 3000 });
  });

  it('rounds other angles to whole millimetres', () => {
    const p = rotatePlan(rectPlan(), 45);
    expect(p.walls[0].end).toEqual({ x: 2828, y: 2828 });
    expect(Math.abs(wallLength(p.walls[0]) - 4000)).toBeLessThanOrEqual(1);
  });

  it('a full turn returns the plan itself', () => {
    const p = rectPlan();
    expect(rotatePlan(p, 360)).toBe(p);
  });
});

describe('mirrorPlan', () => {
  it('flips around the vertical line', () => {
    const p = mirrorPlan(rectPlan(), 'x', 2000);
    expect(p.walls[0].start).toEqual({ x: 4000, y: 0 });
    expect(p.walls[0].end).toEqual({ x: 0, y: 0 });
  });

  it('flips around the horizontal line', () => {
    const p = mirrorPlan(rectPlan(), 'y');
    expect(p.walls[2].start).toEqual({ x: 4000, y: -3000 });
  });

  it('twice is the identity and openings are left alone', () => {
    const p = addOpening(rectPlan(), 'w-001', 'door', 100);
    const m = mirrorPlan(p, 'x', 123);
    expect(m.openings).toEqual(p.openings);
    expect(mirrorPlan(m, 'x', 123)).toEqual(p);
  });
});

describe('scalePlan', () => {
  it('scales positions, offsets and widths but not the wall section', () => {
    const p = scalePlan(addOpening(rectPlan(), 'w-001', 'door', 100), 2);
    expect(p.walls[0].end).toEqual({ x: 8000, y: 0 });
    expect(p.walls[0].thickness).toBe(150);
    expect(p.walls[0].height).toBe(2700);
    expect(p.openings[0]).toMatchObject({ offset: 200, width: 1800, height: 2100, sill: 0 });
  });

  it('refuses a factor that is not a positive number', () => {
    for (const k of [0, -1, NaN, Infinity]) expect(() => scalePlan(rectPlan(), k)).toThrow(RangeError);
  });
});
