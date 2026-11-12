import { settings } from './settings';
import { distance } from './geometry';

export interface Point {
  x: number;
  y: number;
}

export interface Wall {
  id: string;
  start: Point;
  end: Point;
  /** mm */
  thickness: number;
  /** mm */
  height: number;
}

export type OpeningKind = 'door' | 'window';

export interface Opening {
  id: string;
  wallId: string;
  kind: OpeningKind;
  /**
   * Distance in mm from wall.start to the NEAR EDGE of the opening, measured
   * along the wall. It is not the centre of the opening: an opening that
   * covers the first metre of a wall has offset 0, width 1000.
   */
  offset: number;
  width: number;
  height: number;
  /** Height of the bottom edge above the floor, mm. */
  sill: number;
}

export type Units = 'mm' | 'cm' | 'm';

export interface PlanMeta {
  name: string;
  units: Units;
}

export interface Plan {
  meta: PlanMeta;
  walls: Wall[];
  openings: Opening[];
}

export function emptyPlan(name = 'untitled'): Plan {
  return { meta: { name, units: 'mm' }, walls: [], openings: [] };
}

export function wallLength(w: Wall): number {
  return distance(w.start, w.end);
}

/**
 * Next free id for a prefix ("w", "o"): w-001, w-002, ...
 * Ids are never reused inside a plan, so removing the last wall and adding
 * another one gives the removed id back only if nothing else took it.
 */
export function nextId(prefix: string, taken: { id: string }[]): string {
  let max = 0;
  const head = prefix + '-';
  for (const t of taken) {
    if (!t.id.startsWith(head)) continue;
    const n = parseInt(t.id.slice(head.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return head + String(max + 1).padStart(3, '0');
}

export interface WallOptions {
  thickness?: number;
  height?: number;
}

export function addWall(plan: Plan, start: Point, end: Point, opts: WallOptions = {}): Plan {
  const wall: Wall = {
    id: nextId('w', plan.walls),
    start: { x: Math.round(start.x), y: Math.round(start.y) },
    end: { x: Math.round(end.x), y: Math.round(end.y) },
    thickness: opts.thickness ?? settings.wall.defaultThickness,
    height: opts.height ?? settings.wall.defaultHeight,
  };
  return { ...plan, walls: [...plan.walls, wall] };
}

export function updateWall(plan: Plan, id: string, patch: Partial<Omit<Wall, 'id'>>): Plan {
  return {
    ...plan,
    walls: plan.walls.map((w) => (w.id === id ? { ...w, ...patch } : w)),
  };
}

/** Removes a wall and every opening that sits on it. */
export function removeWall(plan: Plan, id: string): Plan {
  return {
    ...plan,
    walls: plan.walls.filter((w) => w.id !== id),
    openings: plan.openings.filter((o) => o.wallId !== id),
  };
}

export function findWall(plan: Plan, id: string): Wall | undefined {
  return plan.walls.find((w) => w.id === id);
}

export function addOpening(
  plan: Plan,
  wallId: string,
  kind: OpeningKind,
  offset: number,
  opts: Partial<Pick<Opening, 'width' | 'height' | 'sill'>> = {},
): Plan {
  const def = kind === 'door' ? settings.opening.door : settings.opening.window;
  const opening: Opening = {
    id: nextId('o', plan.openings),
    wallId,
    kind,
    offset: Math.round(offset),
    width: opts.width ?? def.width,
    height: opts.height ?? def.height,
    sill: opts.sill ?? def.sill,
  };
  return { ...plan, openings: [...plan.openings, opening] };
}

export function removeOpening(plan: Plan, id: string): Plan {
  return { ...plan, openings: plan.openings.filter((o) => o.id !== id) };
}

export function renamePlan(plan: Plan, name: string): Plan {
  return { ...plan, meta: { ...plan.meta, name } };
}

export function planBounds(plan: Plan): { min: Point; max: Point } | null {
  if (plan.walls.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const w of plan.walls) {
    for (const p of [w.start, w.end]) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  return { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } };
}
