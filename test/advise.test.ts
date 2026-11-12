import { describe, expect, it } from 'vitest';
import { addOpening, addWall, emptyPlan } from '../src/core/model';
import { advisePlan } from '../src/core/advise';
import { addRectRoom } from '../src/core/templates';
import { rectPlan } from './helpers';

const codes = (p: Parameters<typeof advisePlan>[0]) => advisePlan(p).map((a) => a.code);

describe('advisePlan', () => {
  it('is quiet about a plain room', () => {
    expect(advisePlan(rectPlan())).toEqual([]);
  });

  it('flags a narrow door but not a narrow window', () => {
    let p = addOpening(rectPlan(), 'w-001', 'door', 1000, { width: 700 });
    p = addOpening(p, 'w-003', 'window', 1000, { width: 500 });
    expect(codes(p)).toEqual(['door-narrow']);
  });

  it('flags a window that starts almost on the floor', () => {
    const p = addOpening(rectPlan(), 'w-001', 'window', 1000, { sill: 100 });
    expect(codes(p)).toEqual(['window-low-sill']);
  });

  it('flags an opening jammed against a wall end, on either end', () => {
    expect(codes(addOpening(rectPlan(), 'w-001', 'door', 50))).toEqual(['opening-near-corner']);
    expect(codes(addOpening(rectPlan(), 'w-001', 'door', 3050))).toEqual(['opening-near-corner']);
    expect(codes(addOpening(rectPlan(), 'w-001', 'door', 100))).toEqual([]);
  });

  it('flags a very short wall', () => {
    const p = addWall(emptyPlan(), { x: 0, y: 0 }, { x: 200, y: 0 });
    expect(codes(p)).toEqual(['wall-short']);
  });

  it('flags a long thin wall', () => {
    const p = addWall(emptyPlan(), { x: 0, y: 0 }, { x: 9000, y: 0 }, { thickness: 100 });
    expect(codes(p)).toEqual(['wall-unsupported-span']);
    expect(codes(addWall(emptyPlan(), { x: 0, y: 0 }, { x: 9000, y: 0 }, { thickness: 150 }))).toEqual([]);
  });

  it('flags a room under four square metres', () => {
    expect(codes(addRectRoom(emptyPlan(), 0, 0, 1500, 2000).plan)).toEqual(['room-small']);
    expect(codes(addRectRoom(emptyPlan(), 0, 0, 2500, 2500).plan)).toEqual([]);
  });

  it('keeps wall and opening ids on the advice so the editor can select them', () => {
    const a = advisePlan(addOpening(rectPlan(), 'w-002', 'door', 1000, { width: 600 }))[0];
    expect(a).toMatchObject({ wallId: 'w-002', openingId: 'o-001' });
    expect(a.message).toContain('o-001');
  });

  it('ignores an opening on a missing wall', () => {
    expect(advisePlan(addOpening(rectPlan(), 'w-404', 'door', 0, { width: 500 }))).toEqual([]);
  });
});
