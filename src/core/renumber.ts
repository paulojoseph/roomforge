import type { Plan } from './model';

const pad = (n: number) => String(n).padStart(3, '0');

/**
 * Gives walls and openings the ids w-001.. and o-001.. in the order they are
 * stored, and points every opening at the new id of its wall. Useful after
 * many deletions, or before a diff of two hand-edited files. Openings that
 * point at a wall that does not exist keep their wallId, the validator reports them.
 */
export function renumberIds(plan: Plan): Plan {
  const map = new Map<string, string>();
  const walls = plan.walls.map((w, i) => {
    const id = 'w-' + pad(i + 1);
    // for a duplicate id the first wall wins, the same way findWall() does
    if (!map.has(w.id)) map.set(w.id, id);
    return { ...w, id };
  });
  const openings = plan.openings.map((o, i) => ({
    ...o,
    id: 'o-' + pad(i + 1),
    wallId: map.get(o.wallId) ?? o.wallId,
  }));
  return { ...plan, walls, openings };
}

/** True when ids are already w-001.. / o-001.. in order. */
export function isRenumbered(plan: Plan): boolean {
  return (
    plan.walls.every((w, i) => w.id === 'w-' + pad(i + 1)) && plan.openings.every((o, i) => o.id === 'o-' + pad(i + 1))
  );
}
