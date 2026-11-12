import { describe, expect, it } from 'vitest';
import { area_inner, find_rooms } from '../src/core/rooms';
import { rectPlan } from './helpers';

describe('rooms', () => {
  it('finds the room of a closed rectangle', () => {
    const rooms = find_rooms(rectPlan(5000, 4000));
    expect(rooms).toHaveLength(1);
    expect(rooms[0].id).toBe('room-01');
    expect(rooms[0].wallIds).toEqual(['w-001', 'w-002', 'w-003', 'w-004']);
  });

  it('measures the centre line area and perimeter', () => {
    const [r] = find_rooms(rectPlan(5000, 4000));
    expect(r.area).toBe(20_000_000);
    expect(r.perimeter).toBe(18_000);
  });

  it('measures the inner face area', () => {
    const p = rectPlan(5000, 4000, 100);
    const [r] = find_rooms(p);
    expect(area_inner(r, p)).toBe(4900 * 3900);
  });

  it('numbers separate rectangles in the order of their first wall', () => {
    const a = rectPlan(3000, 3000);
    const b = rectPlan(2000, 2000);
    const shifted = b.walls.map((w, i) => ({
      ...w,
      id: 'w-' + String(i + 5).padStart(3, '0'),
      start: { x: w.start.x + 5000, y: w.start.y },
      end: { x: w.end.x + 5000, y: w.end.y },
    }));
    const rooms = find_rooms({ ...a, walls: [...a.walls, ...shifted] });
    expect(rooms.map((r) => r.id)).toEqual(['room-01', 'room-02']);
    expect(rooms.map((r) => r.area)).toEqual([9_000_000, 4_000_000]);
  });
});
