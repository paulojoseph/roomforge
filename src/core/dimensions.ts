// Dimension lines for drawings: where to put the line, the extension lines
// and the text for each wall and each opening. Pure geometry, the SVG export
// and the 2D editor draw them however they like.

import type { Plan, Point, Wall } from './model';
import { wallLength } from './model';
import { leftNormal, unit } from './geometry';
import { pointOnWall } from './openings';
import { settings } from './settings';

export interface DimensionLine {
  /** the two measured points, on the wall centre line */
  a: Point;
  b: Point;
  /** the dimension line itself, moved away from the wall */
  from: Point;
  to: Point;
  /** mm */
  value: number;
  /** middle of the line, where the text goes */
  label: Point;
  /** text angle in degrees, kept in (-90, 90] so it never reads upside down */
  angle: number;
  wallId: string;
  openingId?: string;
}

export interface DimensionOptions {
  /** gap between the wall face and the dimension line, mm */
  gap?: number;
  /** which side of the wall: 1 is the left of start -> end, -1 the right */
  side?: 1 | -1;
}

function textAngle(a: Point, b: Point): number {
  let deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  if (deg > 90) deg -= 180;
  if (deg <= -90) deg += 180;
  return deg;
}

function line(w: Wall, from: number, to: number, gap: number, side: 1 | -1, openingId?: string): DimensionLine {
  const a = pointOnWall(w, from);
  const b = pointOnWall(w, to);
  const n = leftNormal(unit(w.start, w.end));
  const out = (w.thickness / 2 + gap) * side;
  const lf = { x: a.x + n.x * out, y: a.y + n.y * out };
  const lt = { x: b.x + n.x * out, y: b.y + n.y * out };
  return {
    a,
    b,
    from: lf,
    to: lt,
    value: Math.round(to - from),
    label: { x: (lf.x + lt.x) / 2, y: (lf.y + lt.y) / 2 },
    angle: textAngle(lf, lt),
    wallId: w.id,
    ...(openingId ? { openingId } : {}),
  };
}

/** One line per wall, along its whole centre line. Zero length walls are skipped. */
export function wallDimensions(plan: Plan, opts: DimensionOptions = {}): DimensionLine[] {
  const gap = opts.gap ?? settings.drawing.dimensionGapMm;
  const side = opts.side ?? 1;
  return plan.walls.filter((w) => wallLength(w) > 0).map((w) => line(w, 0, wallLength(w), gap, side));
}

/** One line per opening, its width, on the opposite side from the wall dimension. */
export function openingDimensions(plan: Plan, opts: DimensionOptions = {}): DimensionLine[] {
  const gap = opts.gap ?? settings.drawing.dimensionGapMm;
  const side = (opts.side ?? 1) === 1 ? -1 : 1;
  const out: DimensionLine[] = [];
  for (const op of plan.openings) {
    const w = plan.walls.find((x) => x.id === op.wallId);
    if (!w || wallLength(w) === 0) continue;
    out.push(line(w, op.offset, op.offset + op.width, gap, side, op.id));
  }
  return out;
}

/**
 * Chain of dimensions along one wall: the distance from the start to the first
 * opening, the openings themselves, the gaps between them and the rest up to
 * the end. The values add up to the wall length as long as the openings do not
 * overlap and stay inside the wall.
 */
export function wallChain(plan: Plan, wallId: string): { label: string; value: number }[] {
  const w = plan.walls.find((x) => x.id === wallId);
  if (!w) return [];
  const ops = plan.openings.filter((o) => o.wallId === wallId).sort((a, b) => a.offset - b.offset);
  const out: { label: string; value: number }[] = [];
  let at = 0;
  for (const op of ops) {
    if (op.offset > at) out.push({ label: 'wall', value: op.offset - at });
    out.push({ label: op.id, value: op.width });
    at = op.offset + op.width;
  }
  const len = wallLength(w);
  if (len > at) out.push({ label: 'wall', value: len - at });
  return out;
}
