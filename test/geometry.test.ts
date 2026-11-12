import { describe, expect, it } from 'vitest';
import { bounds, closestOnSegment, distance, distanceSq, leftNormal } from '../src/core/geometry';

describe('geometry', () => {
  it('distance rounds to the nearest millimetre', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(distance({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(1);
    expect(distance({ x: 0, y: 0 }, { x: 2, y: 2 })).toBe(3);
  });

  it('distanceSq is exact', () => {
    expect(distanceSq({ x: 1, y: 1 }, { x: 4, y: 5 })).toBe(25);
  });

  it('leftNormal turns a direction a quarter turn counter clockwise', () => {
    expect(leftNormal({ x: 1, y: 0 })).toEqual({ x: -0, y: 1 });
  });

  it('closestOnSegment clamps to the ends', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 100, y: 0 };
    expect(closestOnSegment({ x: 50, y: 30 }, a, b).point).toEqual({ x: 50, y: 0 });
    expect(closestOnSegment({ x: -20, y: 0 }, a, b).point).toEqual({ x: 0, y: 0 });
    expect(closestOnSegment({ x: 50, y: 30 }, a, b).dist).toBe(30);
  });

  it('bounds of nothing is null', () => {
    expect(bounds([])).toBeNull();
    expect(bounds([{ x: 3, y: -1 }, { x: -2, y: 8 }])).toEqual({ min: { x: -2, y: -1 }, max: { x: 3, y: 8 } });
  });
});
