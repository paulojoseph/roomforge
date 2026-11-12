// Ready-made shapes for the "add room" menu and for tests. Walls are drawn
// counter clockwise, so a room made here is never the clockwise case.

import type { Plan, Point, WallOptions } from './model';
import { addWall } from './model';

export interface Added {
  plan: Plan;
  /** ids of the new walls, in drawing order */
  wallIds: string[];
}

/** Closed loop of walls through the given corners, first corner to last and back to the first. */
export function addLoop(plan: Plan, corners: Point[], opts: WallOptions = {}): Added {
  if (corners.length < 3) throw new RangeError('a loop needs at least 3 corners');
  let next = plan;
  const wallIds: string[] = [];
  for (let i = 0; i < corners.length; i++) {
    next = addWall(next, corners[i], corners[(i + 1) % corners.length], opts);
    wallIds.push(next.walls[next.walls.length - 1].id);
  }
  return { plan: next, wallIds };
}

/** Rectangular room with its lower left corner at (x, y). */
export function addRectRoom(plan: Plan, x: number, y: number, width: number, depth: number, opts: WallOptions = {}): Added {
  if (width <= 0 || depth <= 0) throw new RangeError('width and depth must be positive');
  return addLoop(
    plan,
    [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + depth },
      { x, y: y + depth },
    ],
    opts,
  );
}

/**
 * L shaped room: a width x depth box with a notch cut out of its upper right
 * corner, notchW wide and notchD deep.
 */
export function addLRoom(
  plan: Plan,
  x: number,
  y: number,
  width: number,
  depth: number,
  notchW: number,
  notchD: number,
  opts: WallOptions = {},
): Added {
  if (notchW <= 0 || notchD <= 0 || notchW >= width || notchD >= depth) {
    throw new RangeError('the notch has to be smaller than the room');
  }
  return addLoop(
    plan,
    [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + depth - notchD },
      { x: x + width - notchW, y: y + depth - notchD },
      { x: x + width - notchW, y: y + depth },
      { x, y: y + depth },
    ],
    opts,
  );
}
