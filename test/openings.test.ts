import { describe, expect, it } from 'vitest';
import { addOpening } from '../src/core/model';
import { openingRect, openingSpan, openingsOnWall, spansOverlap } from '../src/core/openings';
import { rectPlan } from './helpers';

describe('openings', () => {
  const p = addOpening(addOpening(rectPlan(), 'w-001', 'door', 500), 'w-002', 'window', 200);

  it('lists the openings of one wall', () => {
    expect(openingsOnWall(p, 'w-001').map((o) => o.id)).toEqual(['o-001']);
    expect(openingsOnWall(p, 'w-003')).toEqual([]);
  });

  it('the offset is the near edge, so the span starts there', () => {
    expect(openingSpan(p.openings[0])).toEqual({ from: 500, to: 1400 });
  });

  it('spans that only touch do not overlap', () => {
    const a = { ...p.openings[0], offset: 0, width: 900 };
    const b = { ...p.openings[0], offset: 900, width: 900 };
    const c = { ...p.openings[0], offset: 899, width: 900 };
    expect(spansOverlap(a, b)).toBe(false);
    expect(spansOverlap(a, c)).toBe(true);
  });

  it('openingRect gives four vertices in front of the wall face', () => {
    const r = openingRect(p.walls[0], p.openings[0], -1);
    expect(r).toHaveLength(12);
    // wall w-001 runs along x at y = 0, 150 thick: the right-hand face is at y = -75, plus 2
    expect(r[2]).toBeCloseTo(0.077, 6);
    expect(r[1]).toBe(0);
    expect(r[7]).toBeCloseTo(2.1, 6);
  });
});
