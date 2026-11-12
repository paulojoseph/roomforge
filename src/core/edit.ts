// Editing operations that touch more than one thing at once: a wall and the
// openings that sit on it. Every function returns a new plan, or null when
// the request does not make sense (unknown id, cut outside the wall...).

import type { Opening, Plan, Wall } from './model';
import { findWall, nextId, wallLength } from './model';
import { dot, roundPoint, samePoint, sub, cross } from './geometry';
import { pointOnWall } from './openings';
import { settings } from './settings';

export interface SplitResult {
  plan: Plan;
  /** the original wall, now ending at the cut */
  firstId: string;
  /** the new wall, from the cut to the old end */
  secondId: string;
  /** openings that crossed the cut and could not be kept */
  dropped: string[];
}

/**
 * Cuts a wall in two at `along` mm from its start. Openings that end before
 * the cut stay on the first wall, openings that start after it move to the
 * second one. An opening that crosses the cut is removed and reported.
 */
export function splitWall(plan: Plan, wallId: string, along: number): SplitResult | null {
  const wall = findWall(plan, wallId);
  if (!wall) return null;
  const len = wallLength(wall);
  const at = Math.round(along);
  if (at <= 0 || at >= len) return null;

  const cut = roundPoint(pointOnWall(wall, at));
  const secondId = nextId('w', plan.walls);
  const second: Wall = { ...wall, id: secondId, start: cut };
  const first: Wall = { ...wall, end: cut };

  const dropped: string[] = [];
  const openings: Opening[] = [];
  for (const op of plan.openings) {
    if (op.wallId !== wallId) {
      openings.push(op);
    } else if (op.offset + op.width <= at) {
      openings.push(op);
    } else if (op.offset >= at) {
      openings.push({ ...op, wallId: secondId, offset: op.offset - at });
    } else {
      dropped.push(op.id);
    }
  }

  const walls: Wall[] = [];
  for (const w of plan.walls) {
    walls.push(w.id === wallId ? first : w);
    if (w.id === wallId) walls.push(second);
  }
  return { plan: { ...plan, walls, openings }, firstId: wallId, secondId, dropped };
}

/** Swaps start and end. Openings keep their place on the wall, so their offsets are mirrored. */
export function flipWall(plan: Plan, wallId: string): Plan | null {
  const wall = findWall(plan, wallId);
  if (!wall) return null;
  const len = wallLength(wall);
  return {
    ...plan,
    walls: plan.walls.map((w) => (w.id === wallId ? { ...w, start: w.end, end: w.start } : w)),
    openings: plan.openings.map((o) => (o.wallId === wallId ? { ...o, offset: len - (o.offset + o.width) } : o)),
  };
}

/**
 * Joins two walls that meet end to end on a straight line into one. They must
 * have the same thickness and height. The wall that comes first along the line
 * keeps its id (whichever order the ids are given in); openings of the other
 * wall are moved over with their offsets shifted.
 */
export function mergeWalls(plan: Plan, idA: string, idB: string): Plan | null {
  if (idA === idB) return null;
  let a = findWall(plan, idA);
  let b = findWall(plan, idB);
  if (!a || !b) return null;
  if (a.thickness !== b.thickness || a.height !== b.height) return null;

  let work = plan;
  // bring them to the shape a.end === b.start
  if (samePoint(a.end, b.start)) {
    // already
  } else if (samePoint(a.end, b.end)) {
    work = flipWall(work, b.id) as Plan;
  } else if (samePoint(a.start, b.start)) {
    work = flipWall(work, a.id) as Plan;
  } else if (samePoint(a.start, b.end)) {
    [a, b] = [b, a];
  } else {
    return null;
  }
  a = findWall(work, a.id) as Wall;
  b = findWall(work, b.id) as Wall;

  const da = sub(a.end, a.start);
  const db = sub(b.end, b.start);
  // integer coordinates, so collinear means the cross product is exactly 0
  if (cross(da, db) !== 0 || dot(da, db) <= 0) return null;

  const shift = wallLength(a);
  const mergedId = a.id;
  const goneId = b.id;
  return {
    ...work,
    walls: work.walls
      .filter((w) => w.id !== goneId)
      .map((w) => (w.id === mergedId ? { ...w, end: (b as Wall).end } : w)),
    openings: work.openings.map((o) => (o.wallId === goneId ? { ...o, wallId: mergedId, offset: o.offset + shift } : o)),
  };
}

/** Moves the whole wall, openings travel with it. */
export function moveWall(plan: Plan, wallId: string, dx: number, dy: number): Plan | null {
  if (!findWall(plan, wallId)) return null;
  const mx = Math.round(dx);
  const my = Math.round(dy);
  return {
    ...plan,
    walls: plan.walls.map((w) =>
      w.id === wallId
        ? { ...w, start: { x: w.start.x + mx, y: w.start.y + my }, end: { x: w.end.x + mx, y: w.end.y + my } }
        : w,
    ),
  };
}

/** Slides an opening along its wall. The new offset is kept inside the wall. */
export function moveOpening(plan: Plan, openingId: string, offset: number): Plan | null {
  const op = plan.openings.find((o) => o.id === openingId);
  const wall = op && findWall(plan, op.wallId);
  if (!op || !wall) return null;
  const max = Math.max(0, wallLength(wall) - op.width);
  const next = Math.min(max, Math.max(0, Math.round(offset)));
  return { ...plan, openings: plan.openings.map((o) => (o.id === openingId ? { ...o, offset: next } : o)) };
}

/**
 * Changes the width and keeps the near edge where it is. The width is held
 * between the limits in settings and inside the wall; if the opening would run
 * past the end it slides back instead.
 */
export function resizeOpening(plan: Plan, openingId: string, width: number): Plan | null {
  const op = plan.openings.find((o) => o.id === openingId);
  const wall = op && findWall(plan, op.wallId);
  if (!op || !wall) return null;
  const len = wallLength(wall);
  const w = Math.min(settings.opening.maxWidth, Math.max(settings.opening.minWidth, Math.round(width)), len);
  const offset = Math.max(0, Math.min(op.offset, len - w));
  return { ...plan, openings: plan.openings.map((o) => (o.id === openingId ? { ...o, width: w, offset } : o)) };
}
