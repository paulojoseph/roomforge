import type { Plan } from './model';
import { wallBox } from './walls-geometry';

/**
 * Wavefront OBJ, metres, Y up. One object per wall, one box each.
 * Kept from the first export experiments; the app does not use it.
 */
export function exportObj(plan: Plan): string {
  const lines: string[] = ['# roomforge ' + plan.meta.name];
  let base = 0;
  for (const w of plan.walls) {
    const m = wallBox(w);
    lines.push('o ' + w.id);
    for (let i = 0; i < m.positions.length; i += 3) {
      lines.push(
        `v ${m.positions[i].toFixed(4)} ${m.positions[i + 1].toFixed(4)} ${m.positions[i + 2].toFixed(4)}`,
      );
    }
    for (let i = 0; i < m.indices.length; i += 3) {
      lines.push(`f ${base + m.indices[i] + 1} ${base + m.indices[i + 1] + 1} ${base + m.indices[i + 2] + 1}`);
    }
    base += m.positions.length / 3;
  }
  return lines.join('\n') + '\n';
}
