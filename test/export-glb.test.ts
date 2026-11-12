import { describe, expect, it } from 'vitest';
import { exportGlb } from '../src/core/export-glb';
import { checkGlb } from '../src/core/glb-check';
import { emptyPlan } from '../src/core/model';
import { loadFixture } from './helpers';

describe('export-glb', () => {
  it('writes a file the structural checks accept, one node per wall', () => {
    const bytes = exportGlb(loadFixture('studio-30'));
    expect(checkGlb(bytes)).toEqual([]);
    const jsonLen = new DataView(bytes.buffer).getUint32(12, true);
    const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLen)));
    expect(json.nodes).toHaveLength(4);
    expect(json.meshes).toHaveLength(4);
    expect(checkGlb(exportGlb(emptyPlan()))).toEqual([]);
  });

  it('gives the same bytes every time', () => {
    const plan = loadFixture('l-room');
    expect(Buffer.from(exportGlb(plan)).equals(Buffer.from(exportGlb(plan)))).toBe(true);
  });
});
