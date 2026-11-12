import type { Opening, Plan, Wall } from './model';
import { nextId } from './model';

/** Walls and the openings on them, detached from any plan. Safe to keep and paste later. */
export interface PlanFragment {
  walls: Wall[];
  openings: Opening[];
}

/** Copies the given walls with every opening that sits on them. Unknown ids are skipped. */
export function copyWalls(plan: Plan, wallIds: string[]): PlanFragment {
  const wanted = new Set(wallIds);
  const walls = plan.walls.filter((w) => wanted.has(w.id)).map((w) => ({ ...w, start: { ...w.start }, end: { ...w.end } }));
  const kept = new Set(walls.map((w) => w.id));
  const openings = plan.openings.filter((o) => kept.has(o.wallId)).map((o) => ({ ...o }));
  return { walls, openings };
}

/**
 * Adds a copy of the fragment, moved by (dx, dy). Everything gets a fresh id;
 * the ids of the new walls are returned so the caller can select them.
 */
export function pasteFragment(
  plan: Plan,
  fragment: PlanFragment,
  dx = 0,
  dy = 0,
): { plan: Plan; wallIds: string[]; openingIds: string[] } {
  const mx = Math.round(dx);
  const my = Math.round(dy);
  const walls = [...plan.walls];
  const openings = [...plan.openings];
  const idMap = new Map<string, string>();

  for (const w of fragment.walls) {
    const id = nextId('w', walls);
    idMap.set(w.id, id);
    walls.push({
      ...w,
      id,
      start: { x: w.start.x + mx, y: w.start.y + my },
      end: { x: w.end.x + mx, y: w.end.y + my },
    });
  }

  const openingIds: string[] = [];
  for (const o of fragment.openings) {
    const wallId = idMap.get(o.wallId);
    if (!wallId) continue;
    const id = nextId('o', openings);
    openings.push({ ...o, id, wallId });
    openingIds.push(id);
  }
  return { plan: { ...plan, walls, openings }, wallIds: [...idMap.values()], openingIds };
}
