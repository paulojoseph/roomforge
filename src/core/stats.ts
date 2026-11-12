import type { Opening, Plan, Wall } from './model';
import { wallLength } from './model';

export interface PlanStats {
  walls: number;
  openings: number;
  doors: number;
  windows: number;
  /** Sum of the centre-line lengths, mm. */
  wallLength: number;
  /** Both faces of every wall, openings taken out, mm2. */
  wallSurface: number;
  /** Footprint times height, openings taken out, mm3. Joins are not corrected, corners count twice. */
  wallVolume: number;
  /** Door and window area together, mm2. */
  openingArea: number;
  tallest: number;
  thickest: number;
}

/** Part of the opening that is really inside the wall height (a window above the top is clipped). */
function visibleHeight(op: Opening, wall: Wall): number {
  return Math.max(0, Math.min(op.height, wall.height - op.sill));
}

function visibleWidth(op: Opening, wall: Wall): number {
  const len = wallLength(wall);
  return Math.max(0, Math.min(op.offset + op.width, len) - Math.max(op.offset, 0));
}

export function openingArea(op: Opening, wall: Wall): number {
  return visibleWidth(op, wall) * visibleHeight(op, wall);
}

/** One face of the wall, mm2, openings taken out. */
export function wallFaceArea(plan: Plan, wall: Wall): number {
  let area = wallLength(wall) * wall.height;
  for (const op of plan.openings) {
    if (op.wallId === wall.id) area -= openingArea(op, wall);
  }
  return Math.max(0, area);
}

export function planStats(plan: Plan): PlanStats {
  const byId = new Map(plan.walls.map((w) => [w.id, w]));
  const stats: PlanStats = {
    walls: plan.walls.length,
    openings: plan.openings.length,
    doors: 0,
    windows: 0,
    wallLength: 0,
    wallSurface: 0,
    wallVolume: 0,
    openingArea: 0,
    tallest: 0,
    thickest: 0,
  };

  for (const w of plan.walls) {
    const face = wallFaceArea(plan, w);
    stats.wallLength += wallLength(w);
    stats.wallSurface += 2 * face;
    stats.wallVolume += face * w.thickness;
    stats.tallest = Math.max(stats.tallest, w.height);
    stats.thickest = Math.max(stats.thickest, w.thickness);
  }

  for (const op of plan.openings) {
    if (op.kind === 'door') stats.doors++;
    else stats.windows++;
    const w = byId.get(op.wallId);
    if (w) stats.openingArea += openingArea(op, w);
  }
  return stats;
}

/** Total centre-line length per wall thickness, thinnest first. Handy to price a wall type. */
export function lengthByThickness(plan: Plan): { thickness: number; length: number; walls: number }[] {
  const map = new Map<number, { thickness: number; length: number; walls: number }>();
  for (const w of plan.walls) {
    const row = map.get(w.thickness) ?? { thickness: w.thickness, length: 0, walls: 0 };
    row.length += wallLength(w);
    row.walls += 1;
    map.set(w.thickness, row);
  }
  return [...map.values()].sort((a, b) => a.thickness - b.thickness);
}
