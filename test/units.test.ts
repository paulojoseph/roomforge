import { describe, expect, it } from 'vitest';
import { convertLength, formatFeetInches, fromMm, parseLength, roundToStep, toMm } from '../src/core/units';

describe('parseLength', () => {
  it('reads metric with and without a unit', () => {
    expect(parseLength('3500')).toBe(3500);
    expect(parseLength('3500mm')).toBe(3500);
    expect(parseLength('350 cm')).toBe(3500);
    expect(parseLength('3.5m')).toBe(3500);
  });

  it('uses the fallback unit only when the text has none', () => {
    expect(parseLength('3.5', 'm')).toBe(3500);
    expect(parseLength('3.5cm', 'm')).toBe(35);
  });

  it('takes a comma as the decimal separator', () => {
    expect(parseLength('3,5 m')).toBe(3500);
    expect(parseLength('1,5')).toBe(2); // 1.5 mm, rounded
  });

  it('reads feet and inches', () => {
    expect(parseLength(`12'6"`)).toBe(3810);
    expect(parseLength('12ft 6in')).toBe(3810);
    expect(parseLength(`6"`)).toBe(152);
    expect(parseLength(`12'`)).toBe(3658);
    expect(parseLength(`-2'`)).toBe(-610);
  });

  it('gives null for text that is not a length', () => {
    for (const bad of ['', '   ', 'abc', '12 x', `12'6`, '3.5.2m', 'm']) {
      expect(parseLength(bad), bad).toBeNull();
    }
  });
});

describe('formatFeetInches', () => {
  it('rounds to the nearest inch', () => {
    expect(formatFeetInches(3810)).toBe(`12' 6"`);
    expect(formatFeetInches(152)).toBe(`6"`);
    expect(formatFeetInches(3658)).toBe(`12'`);
    expect(formatFeetInches(305)).toBe(`1'`);
    expect(formatFeetInches(0)).toBe(`0"`);
    expect(formatFeetInches(-3810)).toBe(`-12' 6"`);
  });

  it('comes back through parseLength within an inch', () => {
    for (const mm of [900, 2100, 4000, 12345]) {
      const back = parseLength(formatFeetInches(mm)) as number;
      expect(Math.abs(back - mm)).toBeLessThanOrEqual(13);
    }
  });
});

describe('unit conversion', () => {
  it('goes through whole millimetres', () => {
    expect(toMm(1.5, 'm')).toBe(1500);
    expect(toMm(0.04, 'mm')).toBe(0);
    expect(fromMm(2500, 'cm')).toBe(250);
    expect(convertLength(1, 'm', 'cm')).toBe(100);
  });

  it('rounds to a step', () => {
    expect(roundToStep(1234, 100)).toBe(1200);
    expect(roundToStep(1250, 100)).toBe(1300);
    expect(roundToStep(1234.6, 0)).toBe(1235);
  });
});
