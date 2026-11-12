// Reads plan files from older versions. parsePlan() in plan-io.ts is strict on
// purpose: it is what the CLI and the editor use for current files. This one
// forgives what the 0.1 and 0.2 files left out and tells you what it filled in.
//
// Differences handled:
//   0.1  no "meta" at all, only "name"; doors and windows in two arrays
//   0.2  meta without units; walls without thickness or height;
//        openings without sill; coordinates written with decimals

import type { Opening, OpeningKind, Plan, Units, Wall } from './model';
import { nextId } from './model';
import { PlanParseError } from './plan-io';
import { settings } from './settings';

export interface MigrationResult {
  plan: Plan;
  /** What was missing or changed, one line each. Empty when the file was already current. */
  notes: string[];
}

type Raw = Record<string, unknown>;

function isObj(v: unknown): v is Raw {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function finite(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function upgradePlan(text: string): MigrationResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new PlanParseError('file is not valid JSON');
  }
  if (!isObj(raw)) throw new PlanParseError('plan must be a JSON object');

  const notes: string[] = [];
  let rounded = 0;
  const int = (n: number): number => {
    if (!Number.isInteger(n)) rounded++;
    return Math.round(n);
  };
  const coord = (v: unknown, what: string): { x: number; y: number } => {
    if (!isObj(v) || !finite(v.x) || !finite(v.y)) throw new PlanParseError(`${what} must have numeric x and y`);
    return { x: int(v.x), y: int(v.y) };
  };

  // meta
  const meta = isObj(raw.meta) ? raw.meta : {};
  let name: string;
  if (typeof meta.name === 'string' && meta.name !== '') name = meta.name;
  else if (typeof raw.name === 'string' && raw.name !== '') {
    name = raw.name;
    notes.push('name moved into meta');
  } else {
    name = 'untitled';
    notes.push('no plan name, using "untitled"');
  }
  let units: Units = 'mm';
  if (meta.units === 'mm' || meta.units === 'cm' || meta.units === 'm') units = meta.units;
  else notes.push('no units, assuming mm');

  // walls
  if (!Array.isArray(raw.walls)) throw new PlanParseError('walls must be an array');
  let noSection = 0;
  const walls: Wall[] = raw.walls.map((w: unknown, i: number) => {
    if (!isObj(w)) throw new PlanParseError(`walls[${i}] must be an object`);
    if (!finite(w.thickness) || !finite(w.height)) noSection++;
    return {
      id: typeof w.id === 'string' && w.id !== '' ? w.id : `w-${String(i + 1).padStart(3, '0')}`,
      start: coord(w.start, `walls[${i}].start`),
      end: coord(w.end, `walls[${i}].end`),
      thickness: finite(w.thickness) ? int(w.thickness) : settings.wall.defaultThickness,
      height: finite(w.height) ? int(w.height) : settings.wall.defaultHeight,
    };
  });
  if (noSection > 0) notes.push(`${noSection} walls without thickness or height, defaults used`);

  // openings: current files have one array, 0.1 files have "doors" and "windows"
  const entries: { raw: unknown; kind: OpeningKind | null }[] = [];
  const legacy = Array.isArray(raw.doors) || Array.isArray(raw.windows);
  if (Array.isArray(raw.openings)) raw.openings.forEach((o) => entries.push({ raw: o, kind: null }));
  if (Array.isArray(raw.doors)) raw.doors.forEach((o) => entries.push({ raw: o, kind: 'door' }));
  if (Array.isArray(raw.windows)) raw.windows.forEach((o) => entries.push({ raw: o, kind: 'window' }));
  if (legacy) notes.push('doors and windows merged into openings');

  let noSill = 0;
  let noKind = 0;
  const openings: Opening[] = [];
  entries.forEach((e, i) => {
    if (!isObj(e.raw)) throw new PlanParseError(`openings[${i}] must be an object`);
    const o = e.raw;
    let kind = e.kind;
    if (kind === null) {
      if (o.kind === 'door' || o.kind === 'window') kind = o.kind;
      else {
        kind = 'door';
        noKind++;
      }
    }
    const def = kind === 'door' ? settings.opening.door : settings.opening.window;
    if (typeof o.wallId !== 'string' || o.wallId === '') throw new PlanParseError(`openings[${i}].wallId must be a string`);
    if (!finite(o.offset)) throw new PlanParseError(`openings[${i}].offset must be a number`);
    if (!finite(o.sill)) noSill++;
    openings.push({
      id: typeof o.id === 'string' && o.id !== '' ? o.id : nextId('o', openings),
      wallId: o.wallId,
      kind,
      offset: int(o.offset),
      width: finite(o.width) ? int(o.width) : def.width,
      height: finite(o.height) ? int(o.height) : def.height,
      sill: finite(o.sill) ? int(o.sill) : def.sill,
    });
  });
  if (noKind > 0) notes.push(`${noKind} openings without a kind, read as doors`);
  if (noSill > 0) notes.push(`${noSill} openings without a sill, default used`);
  if (rounded > 0) notes.push(`${rounded} coordinates were not whole millimetres and were rounded`);

  return { plan: { meta: { name, units }, walls, openings }, notes };
}
