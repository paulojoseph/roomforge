import { describe, expect, it } from 'vitest';
import { find_rooms } from '../src/core/rooms';
import { loadFixture } from './helpers';

// Detection keeps no state between calls. Run it over the 500 wall office
// plan many times and make sure nothing drifts (this one is slow).
describe('rooms on the 500 wall plan', () => {
  it('finds the same 125 rooms on every run', () => {
    const plan = loadFixture('office-500');
    const first = find_rooms(plan);
    expect(first).toHaveLength(125);
    const total = first.reduce((s, r) => s + r.area, 0);

    for (let i = 0; i < 3600; i++) {
      const again = find_rooms(plan);
      if (again.length !== 125 || again.reduce((s, r) => s + r.area, 0) !== total) {
        throw new Error(`run ${i} gave a different result`);
      }
    }
    expect(total).toBe(125 * 9_000_000);
  }, 240_000);
});
