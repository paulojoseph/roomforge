// Writes fixtures/plans/*.json. Deterministic: same output on every run.
// Does not import anything from src/ on purpose, so the fixtures stay
// independent of the code they are used to test.
//
//   node scripts/generate-fixtures.mjs           write the files
//   node scripts/generate-fixtures.mjs --check   compare with what is on disk

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'fixtures', 'plans');

const pad = (n) => String(n).padStart(3, '0');

function newPlan(name) {
  return { meta: { name, units: 'mm' }, walls: [], openings: [] };
}

function wall(plan, x1, y1, x2, y2, thickness = 150, height = 2700) {
  const id = 'w-' + pad(plan.walls.length + 1);
  plan.walls.push({ id, start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, height });
  return id;
}

function opening(plan, wallId, kind, offset, width, height, sill) {
  const id = 'o-' + pad(plan.openings.length + 1);
  plan.openings.push({ id, wallId, kind, offset, width, height, sill });
  return id;
}

const door = (plan, wallId, offset, width = 900) => opening(plan, wallId, 'door', offset, width, 2100, 0);
const win = (plan, wallId, offset, width = 1200, height = 1200, sill = 900) =>
  opening(plan, wallId, 'window', offset, width, height, sill);

// closed loop through the points, in the order given. returns the wall ids
function loop(plan, pts, thickness = 150, height = 2700) {
  const ids = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    ids.push(wall(plan, a[0], a[1], b[0], b[1], thickness, height));
  }
  return ids;
}

// rectangle drawn counter clockwise from its lower left corner
function rect(plan, x, y, w, h, thickness = 150, height = 2700) {
  return loop(plan, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], thickness, height);
}

function studio30() {
  const p = newPlan('studio-30');
  const [bottom, right, top] = rect(p, 0, 0, 6000, 5000);
  door(p, bottom, 1000);
  win(p, top, 2000, 1500);
  win(p, right, 1500, 1200);
  return p;
}

function apartment2br() {
  const p = newPlan('apartment-2br');
  // Rooms are drawn one by one, each with its own four walls. Neighbouring
  // rooms sit one wall thickness apart so the faces touch.
  const living = rect(p, 0, 0, 5000, 4000, 100);
  const kitchen = rect(p, 5100, 0, 3000, 4000, 100);
  const bed1 = rect(p, 0, 4100, 4000, 3500, 100);
  const bed2 = rect(p, 4100, 4100, 3200, 3500, 100);
  // bathroom pod, 50 mm panels
  const bath = rect(p, 7375, 4075, 1800, 2400, 50);

  door(p, living[0], 800);
  win(p, living[3], 1200, 1800, 1400, 800);
  win(p, kitchen[0], 800);
  door(p, kitchen[3], 1500);
  door(p, bed1[0], 2500, 800);
  win(p, bed1[2], 1000, 1500, 1300, 900);
  door(p, bed2[0], 400, 800);
  win(p, bed2[2], 800, 1400, 1300, 900);
  door(p, bath[0], 300, 700);
  win(p, bath[2], 500, 600, 600, 1400);
  return p;
}

function lRoom() {
  const p = newPlan('l-room');
  const ids = loop(p, [[0, 0], [6000, 0], [6000, 2500], [3000, 2500], [3000, 5000], [0, 5000]]);
  door(p, ids[0], 600);
  win(p, ids[1], 700, 1200);
  win(p, ids[4], 900, 1200);
  return p;
}

function roomCw() {
  const p = newPlan('room-cw');
  // same kind of room, walls drawn clockwise
  const ids = loop(p, [[0, 0], [0, 4000], [5000, 4000], [5000, 0]]);
  door(p, ids[3], 400);
  win(p, ids[1], 1500, 1500);
  return p;
}

function twoRoomsShared() {
  const p = newPlan('two-rooms-shared');
  const b1 = wall(p, 0, 0, 4000, 0);
  const b2 = wall(p, 4000, 0, 8000, 0);
  wall(p, 8000, 0, 8000, 4000);
  const t2 = wall(p, 8000, 4000, 4000, 4000);
  const t1 = wall(p, 4000, 4000, 0, 4000);
  wall(p, 0, 4000, 0, 0);
  const mid = wall(p, 4000, 0, 4000, 4000, 100);
  door(p, mid, 1500, 900);
  door(p, b1, 500);
  win(p, t1, 1200, 1500);
  win(p, t2, 1200, 1500);
  win(p, b2, 2000, 1200);
  return p;
}

function tJunction() {
  const p = newPlan('t-junction');
  const [bottom, , top] = rect(p, 0, 0, 6000, 4000);
  // partition ends in the middle of the bottom and top walls
  const part = wall(p, 3000, 0, 3000, 4000, 100);
  door(p, part, 1000);
  door(p, bottom, 500);
  win(p, top, 800, 1400);
  win(p, top, 3800, 1400);
  return p;
}

function crossingWalls() {
  const p = newPlan('crossing-walls');
  const [bottom, , top] = rect(p, 0, 0, 6000, 6000);
  const h = wall(p, 0, 3000, 6000, 3000, 100);
  const v = wall(p, 3000, 0, 3000, 6000, 100);
  door(p, h, 500);
  door(p, v, 800);
  win(p, top, 1000, 1200);
  win(p, bottom, 4000, 1200);
  return p;
}

function roomInRoom() {
  const p = newPlan('room-in-room');
  const outer = rect(p, 0, 0, 8000, 6000);
  const inner = rect(p, 3000, 2250, 2000, 1500, 100);
  door(p, outer[0], 1000);
  win(p, outer[2], 3000, 1800);
  door(p, inner[0], 600, 800);
  return p;
}

function openPlan() {
  const p = newPlan('open-plan');
  const ids = rect(p, 0, 0, 7000, 5000);
  // low counter that starts at the corner and stops in the middle of the room
  wall(p, 0, 0, 1500, 1500, 100, 1000);
  door(p, ids[0], 3000, 1000);
  win(p, ids[2], 1500, 2000);
  win(p, ids[2], 4500, 1500);
  return p;
}

function angledWalls() {
  const p = newPlan('angled-walls');
  // edges at 0, 30, 135 (45 degrees going back), 180 and 270 degrees
  const ids = loop(p, [[0, 0], [5000, 0], [8464, 2000], [6464, 4000], [0, 4000]]);
  door(p, ids[0], 800);
  win(p, ids[1], 1000, 1500);
  win(p, ids[2], 300, 1200);
  return p;
}

function office500() {
  const p = newPlan('office-500');
  const cols = 5;
  const rows = 25;
  const room = 3000;
  const pitch = 3100;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const ids = rect(p, i * pitch, j * pitch, room, room, 100);
      door(p, ids[0], 300 + ((i + j) % 4) * 200, 900);
    }
  }
  return p;
}

function doorCorner() {
  const p = newPlan('door-corner');
  const [bottom, right] = rect(p, 0, 0, 4000, 3000);
  // 50 mm from the corner at the start of the wall
  door(p, bottom, 50, 900);
  win(p, right, 900, 1200);
  return p;
}

// Same layout the app writes: one wall and one opening per line.
function pt(q) {
  return `{"x": ${q.x}, "y": ${q.y}}`;
}

function toText(plan) {
  const walls = plan.walls.map(
    (w) =>
      `    {"id": ${JSON.stringify(w.id)}, "start": ${pt(w.start)}, "end": ${pt(w.end)}, ` +
      `"thickness": ${w.thickness}, "height": ${w.height}}`,
  );
  const ops = plan.openings.map(
    (o) =>
      `    {"id": ${JSON.stringify(o.id)}, "wallId": ${JSON.stringify(o.wallId)}, "kind": "${o.kind}", ` +
      `"offset": ${o.offset}, "width": ${o.width}, "height": ${o.height}, "sill": ${o.sill}}`,
  );
  const block = (rows) => (rows.length === 0 ? '[]' : '[\n' + rows.join(',\n') + '\n  ]');
  return (
    '{\n' +
    `  "meta": {"name": ${JSON.stringify(plan.meta.name)}, "units": "${plan.meta.units}"},\n` +
    `  "walls": ${block(walls)},\n` +
    `  "openings": ${block(ops)}\n` +
    '}\n'
  );
}

const builders = [
  studio30,
  apartment2br,
  lRoom,
  roomCw,
  twoRoomsShared,
  tJunction,
  crossingWalls,
  roomInRoom,
  openPlan,
  angledWalls,
  office500,
  doorCorner,
];

const plans = builders.map((b) => b());
const check = process.argv.includes('--check');

if (!check) mkdirSync(outDir, { recursive: true });

const bad = [];
for (const plan of plans) {
  const file = join(outDir, plan.meta.name + '.json');
  const text = toText(plan);
  if (check) {
    if (!existsSync(file) || readFileSync(file, 'utf8') !== text) bad.push(plan.meta.name);
  } else {
    writeFileSync(file, text);
  }
}

if (check) {
  if (bad.length > 0) {
    console.error('fixtures differ from the generator: ' + bad.join(', '));
    process.exit(1);
  }
  console.log(`${plans.length} fixtures match the generator.`);
} else {
  console.log(`wrote ${plans.length} fixtures to fixtures/plans`);
}
