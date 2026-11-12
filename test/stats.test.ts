import { describe, expect, it } from 'vitest';
import { addOpening, addWall, emptyPlan } from '../src/core/model';
import { lengthByThickness, openingArea, planStats, wallFaceArea } from '../src/core/stats';
import { rectPlan } from './helpers';

function furnished() {
  let p = rectPlan();
  p = addOpening(p, 'w-001', 'door', 100); // 900 x 2100
  p = addOpening(p, 'w-003', 'window', 500); // 1200 x 1200
  return p;
}

describe('planStats', () => {
  it('adds up a plan with one door and one window', () => {
    const s = planStats(furnished());
    expect(s.walls).toBe(4);
    expect(s.doors).toBe(1);
    expect(s.windows).toBe(1);
    expect(s.wallLength).toBe(14000);
    expect(s.openingArea).toBe(900 * 2100 + 1200 * 1200);
    // faces: 8 910 000 + 8 100 000 + 9 360 000 + 8 100 000
    expect(s.wallSurface).toBe(2 * 34_470_000);
    expect(s.wallVolume).toBe(34_470_000 * 150);
    expect(s.tallest).toBe(2700);
    expect(s.thickest).toBe(150);
  });

  it('is all zeros for an empty plan', () => {
    const s = planStats(emptyPlan());
    expect(Object.values(s).every((v) => v === 0)).toBe(true);
  });

  it('counts an opening on a missing wall but gives it no area', () => {
    const p = addOpening(rectPlan(), 'w-404', 'window', 0);
    const s = planStats(p);
    expect(s.windows).toBe(1);
    expect(s.openingArea).toBe(0);
  });
});

describe('opening area', () => {
  it('is clipped by the wall height', () => {
    const p = addOpening(rectPlan(), 'w-001', 'window', 0, { sill: 2000, height: 1200 });
    expect(openingArea(p.openings[0], p.walls[0])).toBe(1200 * 700);
  });

  it('is clipped by the wall length', () => {
    const p = addOpening(rectPlan(), 'w-001', 'door', 3500, { width: 900 });
    expect(openingArea(p.openings[0], p.walls[0])).toBe(500 * 2100);
  });

  it('never makes a face negative', () => {
    let p = addWall(emptyPlan(), { x: 0, y: 0 }, { x: 1000, y: 0 }, { height: 1000 });
    p = addOpening(p, 'w-001', 'door', 0, { width: 1000, height: 3000 });
    expect(wallFaceArea(p, p.walls[0])).toBe(0);
  });
});

describe('lengthByThickness', () => {
  it('groups and sorts', () => {
    let p = rectPlan(4000, 3000, 150);
    p = addWall(p, { x: 0, y: 1500 }, { x: 4000, y: 1500 }, { thickness: 100 });
    expect(lengthByThickness(p)).toEqual([
      { thickness: 100, length: 4000, walls: 1 },
      { thickness: 150, length: 14000, walls: 4 },
    ]);
  });
});
