import { PlanParseError, parsePlan, serializePlan } from '@/core/plan-io';
import { exportSvg } from '@/core/export-svg';
import { roomsCsv } from '@/core/export-csv';
import type { Plan } from '@/core/model';

export async function readPlanFile(file: File): Promise<Plan> {
  const text = await file.text();
  return parsePlan(text);
}

export function describeError(e: unknown): string {
  if (e instanceof PlanParseError) return e.message;
  if (e instanceof Error) return e.message;
  return 'could not read the file';
}

function download(name: string, text: string, type: string): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Offers the plan as a download. Nothing is sent anywhere. */
export function savePlanFile(plan: Plan): void {
  download(plan.meta.name + '.json', serializePlan(plan), 'application/json');
}

export function saveSvgFile(plan: Plan): void {
  download(plan.meta.name + '.svg', exportSvg(plan, { rooms: true, dimensions: true }), 'image/svg+xml');
}

export function saveRoomsCsv(plan: Plan): void {
  download(plan.meta.name + '-rooms.csv', roomsCsv(plan), 'text/csv');
}
