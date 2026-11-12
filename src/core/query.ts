// Questions about a plan that do not change it: what is under this point,
// which walls touch, where do centre lines cross.

import type { Opening, Plan, Point, Wall } from './model';
import { wallLength } from './model';
import { closestOnSegment, cross, sub } from './geometry';
import { openingCentre } from './openings';
import { settings } from './settings';

/** Distance from p to the centre line of the wall, mm. */
export function distanceToWall(p: Point, w: Wall): number {
  return closestOnSegment(p, w.start, w.end).dist;
}

/**
 * The wall under a point: the nearest one whose half thickness plus `tol`
 * reaches the point. Ties go to the wall that comes first in the plan.
 */
export function wallAt(plan: Plan, p: Point, tol = 0): Wall | null {
  let best: Wall | null = null;
  let bestDist = Infinity;
  for (const w of plan.walls) {
    const d = distanceToWall(p, w);
    if (d <= w.thickness / 2 + tol && d < bestDist) {
      best = w;
      bestDist = d;
    }
  }
  return best;
}

/** The opening whose centre is nearest to p, if it is within `tol` mm of it. */
export function openingAt(plan: Plan, p: Point, tol: number = settings.drawing.openingPickMm): Opening | null {
  let best: Opening | null = null;
  let bestDist = tol;
  for (const op of plan.openings) {
    const w = plan.walls.find((x) => x.id === op.wallId);
    if (!w) continue;
    const c = openingCentre(w, op);
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    if (d <= bestDist) {
      best = op;
      bestDist = d;
    }
  }
  return best;
}

export interface SegmentHit {
  point: Point;
  /** position on the first segment, 0 = a, 1 = b */
  t: number;
  /** position on the second segment */
  u: number;
}

/** Where segment ab meets segment cd. Null when they are parallel or do not reach each other. */
export function intersectSegments(a: Point, b: Point, c: Point, d: Point): SegmentHit | null {
  const r = sub(b, a);
  const s = sub(d, c);
  const den = cross(r, s);
  if (den === 0) return null;
  const ca = sub(c, a);
  const t = cross(ca, s) / den;
  const u = cross(ca, r) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { point: { x: a.x + r.x * t, y: a.y + r.y * t }, t, u };
}

export interface Crossing {
  /** the two walls, in plan order */
  a: string;
  b: string;
  at: Point;
  /** 'cross': both walls go on past the point. 'tee': one of them ends on the other. */
  kind: 'cross' | 'tee';
}

const EDGE = 1e-9;
const inside = (t: number) => t > EDGE && t < 1 - EDGE;

/**
 * Centre lines that meet away from the ends of both walls. Two walls that
 * simply share a corner are not listed. Parallel overlapping walls are not
 * listed either, there is no single point to report.
 */
export function findCrossings(plan: Plan): Crossing[] {
  const out: Crossing[] = [];
  for (let i = 0; i < plan.walls.length; i++) {
    for (let j = i + 1; j < plan.walls.length; j++) {
      const p = plan.walls[i];
      const q = plan.walls[j];
      const hit = intersectSegments(p.start, p.end, q.start, q.end);
      if (!hit) continue;
      const ti = inside(hit.t);
      const ui = inside(hit.u);
      if (!ti && !ui) continue;
      out.push({ a: p.id, b: q.id, at: hit.point, kind: ti && ui ? 'cross' : 'tee' });
    }
  }
  return out;
}

const keyOf = (p: Point) => p.x + ',' + p.y;

/** Ids of the walls that share an end point with this one. */
export function wallsTouching(plan: Plan, wallId: string): string[] {
  const me = plan.walls.find((w) => w.id === wallId);
  if (!me) return [];
  const mine = new Set([keyOf(me.start), keyOf(me.end)]);
  return plan.walls
    .filter((w) => w.id !== wallId && (mine.has(keyOf(w.start)) || mine.has(keyOf(w.end))))
    .map((w) => w.id);
}

/** Groups of walls that are connected through shared end points, in plan order. */
export function connectedGroups(plan: Plan): string[][] {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r) as string;
    parent.set(x, r);
    return r;
  };
  for (const w of plan.walls) parent.set(w.id, w.id);

  const at = new Map<string, string>();
  for (const w of plan.walls) {
    for (const p of [w.start, w.end]) {
      const k = keyOf(p);
      const other = at.get(k);
      if (other === undefined) at.set(k, w.id);
      else parent.set(find(w.id), find(other));
    }
  }

  const groups = new Map<string, string[]>();
  for (const w of plan.walls) {
    const r = find(w.id);
    const g = groups.get(r) ?? [];
    g.push(w.id);
    groups.set(r, g);
  }
  return [...groups.values()];
}

/** Wall ends that no other wall touches. A room can only close when this is empty. */
export function danglingEnds(plan: Plan): { wallId: string; end: 'start' | 'end'; point: Point }[] {
  const count = new Map<string, number>();
  for (const w of plan.walls) {
    for (const p of [w.start, w.end]) count.set(keyOf(p), (count.get(keyOf(p)) ?? 0) + 1);
  }
  const out: { wallId: string; end: 'start' | 'end'; point: Point }[] = [];
  for (const w of plan.walls) {
    if (wallLength(w) === 0) continue;
    if (count.get(keyOf(w.start)) === 1) out.push({ wallId: w.id, end: 'start', point: w.start });
    if (count.get(keyOf(w.end)) === 1) out.push({ wallId: w.id, end: 'end', point: w.end });
  }
  return out;
}
