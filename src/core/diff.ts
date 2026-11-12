import type { Opening, Plan, Wall } from './model';

export interface Changed<T> {
  before: T;
  after: T;
}

export interface PlanDiff {
  meta: string[];
  walls: { added: Wall[]; removed: Wall[]; changed: Changed<Wall>[] };
  openings: { added: Opening[]; removed: Opening[]; changed: Changed<Opening>[] };
}

function sameWall(a: Wall, b: Wall): boolean {
  return (
    a.start.x === b.start.x &&
    a.start.y === b.start.y &&
    a.end.x === b.end.x &&
    a.end.y === b.end.y &&
    a.thickness === b.thickness &&
    a.height === b.height
  );
}

function sameOpening(a: Opening, b: Opening): boolean {
  return (
    a.wallId === b.wallId &&
    a.kind === b.kind &&
    a.offset === b.offset &&
    a.width === b.width &&
    a.height === b.height &&
    a.sill === b.sill
  );
}

function diffById<T extends { id: string }>(
  before: T[],
  after: T[],
  same: (a: T, b: T) => boolean,
): { added: T[]; removed: T[]; changed: Changed<T>[] } {
  const was = new Map(before.map((x) => [x.id, x]));
  const now = new Map(after.map((x) => [x.id, x]));
  const added = after.filter((x) => !was.has(x.id));
  const removed = before.filter((x) => !now.has(x.id));
  const changed: Changed<T>[] = [];
  for (const b of before) {
    const a = now.get(b.id);
    if (a && !same(b, a)) changed.push({ before: b, after: a });
  }
  return { added, removed, changed };
}

/** What happened to walls and openings between two versions of a plan. Matching is by id. */
export function diffPlans(before: Plan, after: Plan): PlanDiff {
  const meta: string[] = [];
  if (before.meta.name !== after.meta.name) meta.push(`name: ${before.meta.name} -> ${after.meta.name}`);
  if (before.meta.units !== after.meta.units) meta.push(`units: ${before.meta.units} -> ${after.meta.units}`);
  return {
    meta,
    walls: diffById(before.walls, after.walls, sameWall),
    openings: diffById(before.openings, after.openings, sameOpening),
  };
}

export function isEmptyDiff(d: PlanDiff): boolean {
  return (
    d.meta.length === 0 &&
    d.walls.added.length + d.walls.removed.length + d.walls.changed.length === 0 &&
    d.openings.added.length + d.openings.removed.length + d.openings.changed.length === 0
  );
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** One short line per kind of change, for a status bar or a log. Empty when nothing changed. */
export function describeDiff(d: PlanDiff): string[] {
  const out = [...d.meta];
  const part = (label: string, added: number, removed: number, changed: number) => {
    const bits: string[] = [];
    if (added) bits.push(`${added} added`);
    if (removed) bits.push(`${removed} removed`);
    if (changed) bits.push(`${changed} changed`);
    if (bits.length) out.push(`${label}: ${bits.join(', ')}`);
  };
  part('walls', d.walls.added.length, d.walls.removed.length, d.walls.changed.length);
  part('openings', d.openings.added.length, d.openings.removed.length, d.openings.changed.length);
  return out;
}

export function countChanges(d: PlanDiff): string {
  const n =
    d.meta.length +
    d.walls.added.length +
    d.walls.removed.length +
    d.walls.changed.length +
    d.openings.added.length +
    d.openings.removed.length +
    d.openings.changed.length;
  return plural(n, 'change', 'changes');
}
