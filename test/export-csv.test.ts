import { describe, expect, it } from 'vitest';
import { addOpening } from '../src/core/model';
import { csvEscape, openingsCsv, roomsCsv, wallsCsv } from '../src/core/export-csv';
import { loadFixture, rectPlan } from './helpers';

describe('csvEscape', () => {
  it('quotes only when it has to', () => {
    expect(csvEscape('plain')).toBe('plain');
    expect(csvEscape(12.5)).toBe('12.5');
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape('two\nlines')).toBe('"two\nlines"');
  });
});

describe('schedules', () => {
  const plan = addOpening(rectPlan(), 'w-001', 'door', 100);

  it('lists walls', () => {
    const lines = wallsCsv(plan).split('\n');
    expect(lines[0]).toBe('id,x1_mm,y1_mm,x2_mm,y2_mm,length_mm,thickness_mm,height_mm,openings');
    expect(lines[1]).toBe('w-001,0,0,4000,0,4000,150,2700,1');
    expect(lines[4]).toBe('w-004,0,3000,0,0,3000,150,2700,0');
    expect(lines).toHaveLength(6); // header, 4 walls, trailing newline
  });

  it('lists openings with their area', () => {
    const lines = openingsCsv(plan).split('\n');
    expect(lines[0]).toBe('id,wall,kind,offset_mm,width_mm,height_mm,sill_mm,area_m2');
    expect(lines[1]).toBe('o-001,w-001,door,100,900,2100,0,1.89');
  });

  it('leaves the area empty for an opening on a missing wall', () => {
    expect(openingsCsv(addOpening(rectPlan(), 'w-404', 'door', 0)).split('\n')[1]).toBe('o-001,w-404,door,0,900,2100,0,');
  });

  it('lists rooms with both area definitions', () => {
    const lines = roomsCsv(plan).split('\n');
    expect(lines[0]).toBe('room,area_inner_m2,area_centre_m2,perimeter_m,walls,openings');
    expect(lines[1]).toBe('room-01,10.97,12.00,14.000,4,1');
  });

  it('has only a header when there is nothing to list', () => {
    expect(roomsCsv({ meta: { name: 'x', units: 'mm' }, walls: [], openings: [] })).toBe(
      'room,area_inner_m2,area_centre_m2,perimeter_m,walls,openings\n',
    );
  });

  it('matches the golden rooms of apartment-2br on the centre-line column', () => {
    const rows = roomsCsv(loadFixture('apartment-2br')).split('\n').slice(1, 6);
    expect(rows.map((r) => r.split(',')[2])).toEqual(['20.00', '12.00', '14.00', '11.20', '4.32']);
  });
});
