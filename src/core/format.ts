import type { Units } from './model';

/** mm2 -> "12.34" (square metres, two decimals). */
export function formatArea(mm2: number): string {
  const m2 = Math.max(0, mm2) / 1_000_000;
  return m2.toFixed(2);
}

export function formatLength(mm: number, units: Units = 'mm'): string {
  switch (units) {
    case 'cm':
      return (mm / 10).toFixed(1) + ' cm';
    case 'm':
      return (mm / 1000).toFixed(2) + ' m';
    default:
      return Math.round(mm) + ' mm';
  }
}

export function formatMeters(mm: number): string {
  return (mm / 1000).toFixed(3);
}
