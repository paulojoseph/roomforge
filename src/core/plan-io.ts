import type { Opening, Plan, Point, Units, Wall } from './model';

export class PlanParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanParseError';
  }
}

const UNITS: Units[] = ['mm', 'cm', 'm'];

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function num(v: unknown, what: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new PlanParseError(`${what} must be a number`);
  }
  return v;
}

function str(v: unknown, what: string): string {
  if (typeof v !== 'string' || v === '') throw new PlanParseError(`${what} must be a non-empty string`);
  return v;
}

function point(v: unknown, what: string): Point {
  if (!isObj(v)) throw new PlanParseError(`${what} must be an object`);
  return { x: num(v.x, `${what}.x`), y: num(v.y, `${what}.y`) };
}

/**
 * Reads a plan file. Only checks shape and types; whether the plan makes
 * sense (lengths, overlaps, gaps) is the validator's job.
 */
export function parsePlan(text: string): Plan {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new PlanParseError('file is not valid JSON');
  }
  if (!isObj(raw)) throw new PlanParseError('plan must be a JSON object');
  if (!isObj(raw.meta)) throw new PlanParseError('meta must be an object');
  if (!Array.isArray(raw.walls)) throw new PlanParseError('walls must be an array');
  if (!Array.isArray(raw.openings)) throw new PlanParseError('openings must be an array');

  const units = raw.meta.units;
  if (typeof units !== 'string' || !UNITS.includes(units as Units)) {
    throw new PlanParseError('meta.units must be mm, cm or m');
  }

  const walls: Wall[] = raw.walls.map((w: unknown, i: number) => {
    if (!isObj(w)) throw new PlanParseError(`walls[${i}] must be an object`);
    return {
      id: str(w.id, `walls[${i}].id`),
      start: point(w.start, `walls[${i}].start`),
      end: point(w.end, `walls[${i}].end`),
      thickness: num(w.thickness, `walls[${i}].thickness`),
      height: num(w.height, `walls[${i}].height`),
    };
  });

  const openings: Opening[] = raw.openings.map((o: unknown, i: number) => {
    if (!isObj(o)) throw new PlanParseError(`openings[${i}] must be an object`);
    if (o.kind !== 'door' && o.kind !== 'window') {
      throw new PlanParseError(`openings[${i}].kind must be door or window`);
    }
    return {
      id: str(o.id, `openings[${i}].id`),
      wallId: str(o.wallId, `openings[${i}].wallId`),
      kind: o.kind,
      offset: num(o.offset, `openings[${i}].offset`),
      width: num(o.width, `openings[${i}].width`),
      height: num(o.height, `openings[${i}].height`),
      sill: num(o.sill, `openings[${i}].sill`),
    };
  });

  return {
    meta: { name: str(raw.meta.name, 'meta.name'), units: units as Units },
    walls,
    openings,
  };
}

function pt(p: Point): string {
  return `{"x": ${p.x}, "y": ${p.y}}`;
}

/**
 * Stable text form: one wall and one opening per line, fixed key order,
 * trailing newline. The same plan always gives the same bytes.
 */
export function serializePlan(plan: Plan): string {
  const walls = plan.walls.map(
    (w) =>
      `    {"id": ${JSON.stringify(w.id)}, "start": ${pt(w.start)}, "end": ${pt(w.end)}, ` +
      `"thickness": ${w.thickness}, "height": ${w.height}}`,
  );
  const openings = plan.openings.map(
    (o) =>
      `    {"id": ${JSON.stringify(o.id)}, "wallId": ${JSON.stringify(o.wallId)}, "kind": "${o.kind}", ` +
      `"offset": ${o.offset}, "width": ${o.width}, "height": ${o.height}, "sill": ${o.sill}}`,
  );
  const block = (rows: string[]) => (rows.length === 0 ? '[]' : '[\n' + rows.join(',\n') + '\n  ]');
  return (
    '{\n' +
    `  "meta": {"name": ${JSON.stringify(plan.meta.name)}, "units": "${plan.meta.units}"},\n` +
    `  "walls": ${block(walls)},\n` +
    `  "openings": ${block(openings)}\n` +
    '}\n'
  );
}
