import { describe, expect, it } from 'vitest';
import { addOpening, emptyPlan } from '../src/core/model';
import { addLRoom, addLoop, addRectRoom } from '../src/core/templates';
import { find_rooms } from '../src/core/rooms';
import { validatePlan } from '../src/core/validate';

describe('templates', () => {
  it('addRectRoom draws four walls counter clockwise, and they close into one room', () => {
    const r = addRectRoom(emptyPlan(), 1000, 2000, 5000, 3000);
    expect(r.wallIds).toEqual(['w-001', 'w-002', 'w-003', 'w-004']);
    expect(r.plan.walls[0]).toMatchObject({ start: { x: 1000, y: 2000 }, end: { x: 6000, y: 2000 } });
    const rooms = find_rooms(r.plan);
    expect(rooms).toHaveLength(1);
    expect(rooms[0].area).toBe(15_000_000);
    expect(validatePlan(r.plan)).toEqual([]);
  });

  it('addLRoom subtracts the notch', () => {
    const r = addLRoom(emptyPlan(), 0, 0, 6000, 4000, 2000, 1500);
    expect(r.wallIds).toHaveLength(6);
    const rooms = find_rooms(r.plan);
    expect(rooms).toHaveLength(1);
    expect(rooms[0].area).toBe(6000 * 4000 - 2000 * 1500);
  });

  it('adds to a plan that already has walls and passes the wall options on', () => {
    let p = addRectRoom(emptyPlan(), 0, 0, 4000, 3000).plan;
    p = addOpening(p, 'w-001', 'door', 100);
    const r = addRectRoom(p, 5000, 0, 3000, 3000, { thickness: 100, height: 2400 });
    expect(r.wallIds).toEqual(['w-005', 'w-006', 'w-007', 'w-008']);
    expect(r.plan.walls[4]).toMatchObject({ thickness: 100, height: 2400 });
    expect(r.plan.openings).toHaveLength(1);
    expect(find_rooms(r.plan)).toHaveLength(2);
  });

  it('refuses shapes that cannot exist', () => {
    expect(() => addRectRoom(emptyPlan(), 0, 0, 0, 3000)).toThrow(RangeError);
    expect(() => addRectRoom(emptyPlan(), 0, 0, 3000, -1)).toThrow(RangeError);
    expect(() => addLRoom(emptyPlan(), 0, 0, 4000, 3000, 4000, 1000)).toThrow('the notch has to be smaller');
    expect(() => addLoop(emptyPlan(), [{ x: 0, y: 0 }, { x: 1, y: 1 }])).toThrow('at least 3 corners');
  });
});
