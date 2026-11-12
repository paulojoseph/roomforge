// Schedules for spreadsheets: walls, openings, rooms. Comma separated, one
// header row, "\n" line endings, a field is quoted only when it has to be.

import type { Plan } from './model';
import { wallLength } from './model';
import { area_inner, count_openings, find_rooms } from './rooms';
import { formatArea } from './format';
import { openingArea } from './stats';

export function csvEscape(value: string | number): string {
  const s = String(value);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function table(header: string[], rows: (string | number)[][]): string {
  return [header, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n') + '\n';
}

export function wallsCsv(plan: Plan): string {
  const rows = plan.walls.map((w) => [
    w.id,
    w.start.x,
    w.start.y,
    w.end.x,
    w.end.y,
    wallLength(w),
    w.thickness,
    w.height,
    plan.openings.filter((o) => o.wallId === w.id).length,
  ]);
  return table(['id', 'x1_mm', 'y1_mm', 'x2_mm', 'y2_mm', 'length_mm', 'thickness_mm', 'height_mm', 'openings'], rows);
}

export function openingsCsv(plan: Plan): string {
  const rows = plan.openings.map((o) => {
    const w = plan.walls.find((x) => x.id === o.wallId);
    return [o.id, o.wallId, o.kind, o.offset, o.width, o.height, o.sill, w ? formatArea(openingArea(o, w)) : ''];
  });
  return table(['id', 'wall', 'kind', 'offset_mm', 'width_mm', 'height_mm', 'sill_mm', 'area_m2'], rows);
}

/** Both area definitions side by side, so nobody has to guess which one a number is. */
export function roomsCsv(plan: Plan): string {
  const rows = find_rooms(plan).map((r) => [
    r.id,
    formatArea(area_inner(r, plan)),
    formatArea(r.area),
    (r.perimeter / 1000).toFixed(3),
    r.wallIds.length,
    count_openings(r, plan),
  ]);
  return table(['room', 'area_inner_m2', 'area_centre_m2', 'perimeter_m', 'walls', 'openings'], rows);
}
