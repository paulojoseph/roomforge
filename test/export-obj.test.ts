import { describe, expect, it } from 'vitest';
import { exportObj } from '../src/core/export-obj';
import { emptyPlan } from '../src/core/model';
import { loadFixture, rectPlan } from './helpers';

describe('export-obj', () => {
  it('starts with a comment naming the plan', () => {
    expect(exportObj(rectPlan()).split('\n')[0]).toBe('# roomforge rect');
  });

  it('writes one object per wall', () => {
    const lines = exportObj(loadFixture('studio-30')).split('\n');
    expect(lines.filter((l) => l.startsWith('o '))).toEqual(['o w-001', 'o w-002', 'o w-003', 'o w-004']);
  });

  it('writes 24 vertices and 12 faces per wall', () => {
    const lines = exportObj(rectPlan()).split('\n');
    expect(lines.filter((l) => l.startsWith('v '))).toHaveLength(4 * 24);
    expect(lines.filter((l) => l.startsWith('f '))).toHaveLength(4 * 12);
  });

  it('face indices of the second wall continue after the first', () => {
    const lines = exportObj(rectPlan()).split('\n');
    const faces = lines.filter((l) => l.startsWith('f '));
    expect(faces[0]).toBe('f 1 2 3');
    expect(faces[12]).toBe('f 25 26 27');
    expect(exportObj(emptyPlan())).toBe('# roomforge untitled\n');
  });
});
