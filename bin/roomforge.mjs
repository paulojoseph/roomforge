#!/usr/bin/env node
// roomforge CLI. Bundled into dist/roomforge.mjs by `npm run build:cli`.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { parsePlan, validatePlan, formatReport, inspectPlan, exportGlb, exportSvg, roomsCsv } from '../src/core/index';

const USAGE = `usage:
  roomforge inspect PLAN            rooms, areas, counts
  roomforge check PLAN              run the validator
  roomforge export PLAN --glb OUT   write a binary glTF file
  roomforge export PLAN --svg OUT   write a drawing (room areas and dimensions included)
  roomforge export PLAN --csv OUT   write the room schedule
`;

function load(path) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch (e) {
    console.error(`cannot read ${path}: ${e.code ?? e.message}`);
    process.exit(2);
  }
  try {
    return parsePlan(text);
  } catch (e) {
    console.error(`${path}: ${e.message}`);
    process.exit(2);
  }
}

const [cmd, file, ...rest] = process.argv.slice(2);

if (!cmd || cmd === '--help' || cmd === '-h') {
  process.stdout.write(USAGE);
  process.exit(cmd ? 0 : 2);
}

if (!file) {
  console.error('missing PLAN argument\n' + USAGE);
  process.exit(2);
}

if (cmd === 'inspect') {
  process.stdout.write(inspectPlan(load(file)));
} else if (cmd === 'check') {
  const lines = formatReport(validatePlan(load(file)));
  process.stdout.write(lines.join('\n') + '\n');
  process.exit(lines.length > 1 ? 1 : 0);
} else if (cmd === 'export') {
  const formats = { '--glb': exportGlb, '--svg': (p) => exportSvg(p, { rooms: true, dimensions: true }), '--csv': roomsCsv };
  const flag = Object.keys(formats).find((f) => rest.includes(f));
  const out = flag ? rest[rest.indexOf(flag) + 1] : undefined;
  if (!flag || !out) {
    console.error('export needs --glb OUT, --svg OUT or --csv OUT\n' + USAGE);
    process.exit(2);
  }
  const data = formats[flag](load(file));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, data);
  console.log(`wrote ${out} (${data.length} ${flag === '--glb' ? 'bytes' : 'characters'})`);
} else {
  console.error(`unknown command ${cmd}\n` + USAGE);
  process.exit(2);
}
