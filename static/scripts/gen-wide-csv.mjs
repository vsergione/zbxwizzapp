import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const outDir = join(root, 'testdata');
mkdirSync(outDir, { recursive: true });

const cols = Array.from({ length: 28 }, (_, i) => `column_${String(i + 1).padStart(2, '0')}`);
const rows = Array.from({ length: 15 }, (_, r) =>
  cols.map((c, i) => `${c}_row${r + 1}_val${i}`)
);

const csv = [cols.join(','), ...rows.map((r) => r.join(','))].join('\n');
const path = join(outDir, 'wide.csv');
writeFileSync(path, csv);
console.log(`Wrote ${path} (${cols.length} columns, ${rows.length} rows)`);
