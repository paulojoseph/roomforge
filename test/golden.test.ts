import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatArea } from '../src/core/format';
import { area_inner, find_rooms } from '../src/core/rooms';
import { loadFixture, root } from './helpers';

interface GoldenRoom {
  id: string;
  label: string;
  areaM2: string;
}

const golden = JSON.parse(readFileSync(join(root, 'fixtures', 'golden', 'apartment-2br.rooms.json'), 'utf8')) as {
  rooms: GoldenRoom[];
};

describe('golden: apartment-2br', () => {
  const plan = loadFixture('apartment-2br');
  const rooms = find_rooms(plan);

  it('finds the same rooms', () => {
    expect(rooms.map((r) => r.id)).toEqual(golden.rooms.map((g) => g.id));
  });

  it.each(golden.rooms)('$id ($label) has the expected area', (g) => {
    const room = rooms.find((r) => r.id === g.id);
    expect(room).toBeDefined();
    expect(formatArea(area_inner(room!, plan))).toBe(g.areaM2);
  });
});
