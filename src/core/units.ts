import type { Units } from './model';

const MM_PER_UNIT: Record<Units, number> = { mm: 1, cm: 10, m: 1000 };
const MM_PER_INCH = 25.4;

/** Whole millimetres. Anything finer than 1 mm is dropped on purpose (ADR 0002). */
export function toMm(value: number, unit: Units): number {
  return Math.round(value * MM_PER_UNIT[unit]);
}

export function fromMm(mm: number, unit: Units): number {
  return mm / MM_PER_UNIT[unit];
}

/** Goes through millimetres, so the result carries the 1 mm rounding of toMm. */
export function convertLength(value: number, from: Units, to: Units): number {
  return fromMm(toMm(value, from), to);
}

/** Round to the nearest multiple of `step` (step <= 0 returns the value rounded to 1 mm). */
export function roundToStep(mm: number, step: number): number {
  if (step <= 0) return Math.round(mm);
  return Math.round(mm / step) * step;
}

// 12'6"  12' 6"  12'  6"  12ft 6in  12ft  6in   (optional leading minus)
const IMPERIAL = /^(-?)\s*(?:(\d+(?:\.\d+)?)\s*(?:'|ft))?\s*(?:(\d+(?:\.\d+)?)\s*(?:"|in))?$/;
const METRIC = /^(-?\d+(?:\.\d+)?)\s*(mm|cm|m)?$/;

/**
 * Reads what a person types in a length field and returns whole millimetres,
 * or null when the text makes no sense.
 *
 *   "3500", "3500mm", "350cm", "3.5m", "3,5 m"   metric ("fallback" is used when there is no unit)
 *   "12'6\"", "12ft 6in", "6\""                  feet and inches
 *
 * A comma is read as a decimal separator, so "1,000" is one, not a thousand.
 */
export function parseLength(text: string, fallback: Units = 'mm'): number | null {
  const s = text.trim().toLowerCase().replace(',', '.');
  if (s === '') return null;

  const imp = IMPERIAL.exec(s);
  if (imp && (imp[2] !== undefined || imp[3] !== undefined)) {
    const feet = imp[2] === undefined ? 0 : parseFloat(imp[2]);
    const inches = imp[3] === undefined ? 0 : parseFloat(imp[3]);
    const mm = Math.round((feet * 12 + inches) * MM_PER_INCH);
    return imp[1] === '-' ? -mm : mm;
  }

  const met = METRIC.exec(s);
  if (!met) return null;
  return toMm(parseFloat(met[1]), (met[2] as Units | undefined) ?? fallback);
}

/** 3810 -> 12' 6", rounded to the nearest inch. */
export function formatFeetInches(mm: number): string {
  const sign = mm < 0 ? '-' : '';
  const total = Math.round(Math.abs(mm) / MM_PER_INCH);
  const feet = Math.floor(total / 12);
  const inches = total % 12;
  if (feet === 0) return `${sign}${inches}"`;
  if (inches === 0) return `${sign}${feet}'`;
  return `${sign}${feet}' ${inches}"`;
}
