import { describe, expect, it } from 'vitest';
import { addOpening, addWall, removeWall } from '../src/core/model';
import { isRenumbered, renumberIds } from '../src/core/renumber';
import { rectPlan } from './helpers';

describe('renumberIds', () => {
  it('closes the gaps and follows the openings', () => {
    let p = addOpening(rectPlan(), 'w-004', 'door', 100); // o-001
    p = addOpening(p, 'w-003', 'window', 500); // o-002
    p = removeWall(p, 'w-002');
    p = addWall(p, { x: 0, y: 1500 }, { x: 4000, y: 1500 }); // w-005
    expect(p.walls.map((w) => w.id)).toEqual(['w-001', 'w-003', 'w-004', 'w-005']);

    const r = renumberIds(p);
    expect(r.walls.map((w) => w.id)).toEqual(['w-001', 'w-002', 'w-003', 'w-004']);
    expect(r.walls[1].end).toEqual({ x: 0, y: 3000 }); // it was w-003
    expect(r.openings.map((o) => [o.id, o.wallId])).toEqual([
      ['o-001', 'w-003'],
      ['o-002', 'w-002'],
    ]);
  });

  it('changes nothing when the ids are already in order', () => {
    const p = addOpening(rectPlan(), 'w-001', 'door', 100);
    expect(isRenumbered(p)).toBe(true);
    expect(renumberIds(p)).toEqual(p);
    expect(renumberIds(renumberIds(p))).toEqual(renumberIds(p));
  });

  it('detects a plan that needs it', () => {
    expect(isRenumbered(removeWall(rectPlan(), 'w-001'))).toBe(false);
  });

  it('leaves a dangling wallId alone', () => {
    const p = addOpening(rectPlan(), 'w-404', 'door', 100);
    expect(renumberIds(p).openings[0].wallId).toBe('w-404');
  });
});
