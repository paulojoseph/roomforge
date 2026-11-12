import { describe, expect, it } from 'vitest';
import { formatArea, formatLength } from '../src/core/format';

describe('format', () => {
  it('areas are square metres with two decimals', () => {
    expect(formatArea(12_345_678)).toBe('12.35');
    expect(formatArea(0)).toBe('0.00');
  });

  it('lengths follow the plan units', () => {
    expect(formatLength(1234, 'mm')).toBe('1234 mm');
    expect(formatLength(1234, 'cm')).toBe('123.4 cm');
    expect(formatLength(1234, 'm')).toBe('1.23 m');
  });
});
