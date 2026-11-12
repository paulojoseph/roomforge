import { describe, expect, it } from 'vitest';
import {
  addOpening,
  addWall,
  emptyPlan,
  findWall,
  nextId,
  planBounds,
  removeWall,
  updateWall,
  wallLength,
} from '../src/core/model';
import { settings } from '../src/core/settings';
import { rectPlan } from './helpers';

describe('model', () => {
  it('starts empty, in millimetres', () => {
    const p = emptyPlan('x');
    expect(p.meta).toEqual({ name: 'x', units: 'mm' });
    expect(p.walls).toEqual([]);
    expect(p.openings).toEqual([]);
  });

  it('numbers new walls w-001, w-002, ...', () => {
    let p = emptyPlan();
    p = addWall(p, { x: 0, y: 0 }, { x: 1000, y: 0 });
    p = addWall(p, { x: 1000, y: 0 }, { x: 1000, y: 1000 });
    expect(p.walls.map((w) => w.id)).toEqual(['w-001', 'w-002']);
  });

  it('uses the defaults from settings for thickness and height', () => {
    const p = addWall(emptyPlan(), { x: 0, y: 0 }, { x: 1000, y: 0 });
    expect(p.walls[0].thickness).toBe(settings.wall.defaultThickness);
    expect(p.walls[0].height).toBe(settings.wall.defaultHeight);
  });

  it('rounds wall coordinates to whole millimetres', () => {
    const p = addWall(emptyPlan(), { x: 0.4, y: 0.6 }, { x: 999.5, y: 10.2 });
    expect(p.walls[0].start).toEqual({ x: 0, y: 1 });
    expect(p.walls[0].end).toEqual({ x: 1000, y: 10 });
  });

  it('nextId continues after the highest number, not after the count', () => {
    expect(nextId('w', [{ id: 'w-001' }, { id: 'w-007' }])).toBe('w-008');
    expect(nextId('o', [{ id: 'w-004' }])).toBe('o-001');
  });

  it('removing a wall removes its openings too', () => {
    let p = rectPlan();
    p = addOpening(p, 'w-001', 'door', 500);
    p = addOpening(p, 'w-002', 'window', 500);
    p = removeWall(p, 'w-001');
    expect(p.walls).toHaveLength(3);
    expect(p.openings.map((o) => o.id)).toEqual(['o-002']);
  });

  it('updateWall changes only the wall asked for', () => {
    const p = updateWall(rectPlan(), 'w-002', { thickness: 200 });
    expect(findWall(p, 'w-002')?.thickness).toBe(200);
    expect(findWall(p, 'w-001')?.thickness).toBe(150);
  });

  it('addOpening takes its size from settings by kind', () => {
    let p = addOpening(rectPlan(), 'w-001', 'door', 100);
    p = addOpening(p, 'w-001', 'window', 2000);
    expect(p.openings[0]).toMatchObject({ width: 900, height: 2100, sill: 0 });
    expect(p.openings[1]).toMatchObject({ width: 1200, height: 1200, sill: 900 });
  });

  it('wallLength is a whole number of millimetres', () => {
    const w = addWall(emptyPlan(), { x: 0, y: 0 }, { x: 3000, y: 4000 }).walls[0];
    expect(wallLength(w)).toBe(5000);
  });

  it('planBounds covers every wall end', () => {
    expect(planBounds(emptyPlan())).toBeNull();
    expect(planBounds(rectPlan(4000, 3000))).toEqual({ min: { x: 0, y: 0 }, max: { x: 4000, y: 3000 } });
  });
});
