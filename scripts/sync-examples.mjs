// Copies a few fixtures into public/plans so the app can import them.
// Only copies. hand-drawn-loft.json lives in the same folder and is not
// touched: it was drawn in the editor and nothing can rebuild it.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const names = ['studio-30', 'apartment-2br', 'l-room'];

mkdirSync(join(root, 'public', 'plans'), { recursive: true });
for (const n of names) {
  copyFileSync(join(root, 'fixtures', 'plans', n + '.json'), join(root, 'public', 'plans', n + '.json'));
}
console.log(`copied ${names.length} plans to public/plans`);
