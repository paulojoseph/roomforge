import type { Opening, Plan, Wall } from './model';
import { leftNormal, unit } from './geometry';
import { planToWorld } from './walls-geometry';

export function openingsOnWall(plan: Plan, wallId: string): Opening[] {
  return plan.openings.filter((o) => o.wallId === wallId);
}

/** Extent of an opening along its wall, mm from wall.start. */
export function openingSpan(op: Opening): { from: number; to: number } {
  return { from: op.offset, to: op.offset + op.width };
}

export function spansOverlap(a: Opening, b: Opening): boolean {
  const sa = openingSpan(a);
  const sb = openingSpan(b);
  return sa.from < sb.to && sb.from < sa.to;
}

/** Plan point at `along` mm from wall.start, on the centre line. */
export function pointOnWall(w: Wall, along: number): { x: number; y: number } {
  const d = unit(w.start, w.end);
  return { x: w.start.x + d.x * along, y: w.start.y + d.y * along };
}

export function openingCentre(w: Wall, op: Opening): { x: number; y: number } {
  return pointOnWall(w, op.offset + op.width / 2);
}

/**
 * A flat rectangle laid 2 mm in front of one face of the wall, where the
 * opening is. side = -1 is the right-hand face (looking from start to end),
 * side = 1 the left-hand one. 12 numbers (4 vertices), triangles 0 1 2 / 0 2 3.
 */
export function openingRect(w: Wall, op: Opening, side: 1 | -1): number[] {
  const d = unit(w.start, w.end);
  const n = leftNormal(d);
  const out = (w.thickness / 2 + 2) * side;
  const at = (along: number, up: number): number[] => {
    const p = {
      x: w.start.x + d.x * along + n.x * out,
      y: w.start.y + d.y * along + n.y * out,
    };
    return planToWorld(p, up);
  };
  const s = op.offset;
  const e = op.offset + op.width;
  const b = op.sill;
  const t = op.sill + op.height;
  const corners = side === -1 ? [at(s, b), at(e, b), at(e, t), at(s, t)] : [at(e, b), at(s, b), at(s, t), at(e, t)];
  return corners.flat();
}
