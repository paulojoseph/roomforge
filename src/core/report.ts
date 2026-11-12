import type { Plan } from './model';
import { advisePlan } from './advise';
import { formatArea, formatMeters } from './format';
import { area_inner, count_openings, find_rooms } from './rooms';
import { lengthByThickness, planStats } from './stats';
import { validatePlan } from './validate';

function mdTable(head: string[], rows: string[][]): string[] {
  const line = (cells: string[]) => '| ' + cells.join(' | ') + ' |';
  return [line(head), line(head.map(() => '---')), ...rows.map(line)];
}

/**
 * Markdown summary of a plan for a ticket or an email: counts, rooms with
 * both area definitions, wall types, and whatever the validator and the
 * advice have to say. Same plan, same text.
 */
export function planReport(plan: Plan): string {
  const stats = planStats(plan);
  const rooms = find_rooms(plan);
  const lines: string[] = [];

  lines.push(`# ${plan.meta.name}`, '');
  lines.push(
    `${stats.walls} walls, ${stats.doors} doors, ${stats.windows} windows. ` +
      `Wall length ${formatMeters(stats.wallLength)} m, wall surface ${formatArea(stats.wallSurface)} m².`,
    '',
  );

  lines.push('## Rooms', '');
  if (rooms.length === 0) {
    lines.push('No closed rooms found.', '');
  } else {
    lines.push(
      ...mdTable(
        ['room', 'inner m²', 'centre m²', 'perimeter m', 'openings'],
        rooms.map((r) => [
          r.id,
          formatArea(area_inner(r, plan)),
          formatArea(r.area),
          (r.perimeter / 1000).toFixed(3),
          String(count_openings(r, plan)),
        ]),
      ),
      '',
    );
  }

  lines.push('## Walls by thickness', '');
  if (stats.walls === 0) {
    lines.push('No walls.', '');
  } else {
    lines.push(
      ...mdTable(
        ['thickness mm', 'walls', 'length m'],
        lengthByThickness(plan).map((r) => [String(r.thickness), String(r.walls), formatMeters(r.length)]),
      ),
      '',
    );
  }

  const problems = validatePlan(plan);
  lines.push('## Problems', '');
  if (problems.length === 0) lines.push('None.');
  else problems.forEach((p) => lines.push(`- ${p.message}`));
  lines.push('');

  const advice = advisePlan(plan);
  lines.push('## Hints', '');
  if (advice.length === 0) lines.push('None.');
  else advice.forEach((a) => lines.push(`- ${a.message}`));
  lines.push('');

  return lines.join('\n');
}
