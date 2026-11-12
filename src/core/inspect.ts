import type { Plan } from './model';
import { area_inner, count_openings, find_rooms } from './rooms';
import { formatArea } from './format';

function row(cells: string[], widths: number[]): string {
  return cells.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd();
}

/**
 * Text report of a plan: rooms with area and perimeter, wall and opening
 * counts, total area. Areas are measured to the inner face of the walls,
 * perimeters along the centre line.
 */
export function inspectPlan(plan: Plan): string {
  const rooms = find_rooms(plan);
  const lines: string[] = [];
  lines.push(`plan: ${plan.meta.name}`);
  lines.push(`walls: ${plan.walls.length}  openings: ${plan.openings.length}  rooms: ${rooms.length}`);
  lines.push('');

  if (rooms.length === 0) {
    lines.push('no closed rooms found');
    return lines.join('\n') + '\n';
  }

  const head = ['room', 'area m2', 'perimeter m', 'walls', 'openings'];
  const widths = [7, 8, 11, 5, 8];
  lines.push(row(head, widths));
  lines.push(row(widths.map((w) => '-'.repeat(w)), widths));

  let total = 0;
  for (const r of rooms) {
    const inner = area_inner(r, plan);
    total += inner;
    lines.push(
      row(
        [r.id, formatArea(inner), (r.perimeter / 1000).toFixed(3), String(r.wallIds.length), String(count_openings(r, plan))],
        widths,
      ),
    );
  }
  lines.push('');
  lines.push(`total area: ${formatArea(total)} m2 (inner face)`);
  return lines.join('\n') + '\n';
}
