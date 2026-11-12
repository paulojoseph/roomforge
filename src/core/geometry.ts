import type { Point } from './model';

export function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(a: Point, k: number): Point {
  return { x: a.x * k, y: a.y * k };
}

export function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y;
}

export function cross(a: Point, b: Point): number {
  return a.x * b.y - a.y * b.x;
}

export function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

/** Distance in whole millimetres. */
export function distance(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.round(Math.sqrt(dx * dx + dy * dy));
}

export function distanceSq(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx * dx + dy * dy;
}

/** Unit vector from a to b. Returns (0, 0) for a zero-length segment. */
export function unit(a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { x: 0, y: 0 };
  return { x: dx / len, y: dy / len };
}

/** Left-hand normal of a direction. */
export function leftNormal(d: Point): Point {
  return { x: -d.y, y: d.x };
}

export function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function roundPoint(p: Point): Point {
  return { x: Math.round(p.x), y: Math.round(p.y) };
}

/** Closest point on segment ab to p, and the distance to it. */
export function closestOnSegment(p: Point, a: Point, b: Point): { point: Point; dist: number; t: number } {
  const ab = sub(b, a);
  const len2 = dot(ab, ab);
  let t = 0;
  if (len2 > 0) t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / len2));
  const point = { x: a.x + ab.x * t, y: a.y + ab.y * t };
  return { point, dist: Math.sqrt(distanceSq(p, point)), t };
}

export function degToRad(d: number): number {
  return (d * Math.PI) / 180;
}

export function bounds(points: Point[]): { min: Point; max: Point } | null {
  if (points.length === 0) return null;
  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = minX;
  let maxY = minY;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
}
