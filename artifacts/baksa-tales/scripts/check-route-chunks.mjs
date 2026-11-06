import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const output = fileURLToPath(new URL('../dist/public/', import.meta.url));
const manifest = JSON.parse(readFileSync(path.join(output, '.vite/manifest.json'), 'utf8'));
const entries = Object.keys(manifest).filter(key => manifest[key].isEntry);
assert.equal(entries.length, 1, 'Expected a single public entry');
const eager = new Set();
function collect(key) {
  if (eager.has(key)) return;
  eager.add(key);
  for (const dependency of manifest[key].imports || []) collect(dependency);
}
collect(entries[0]);
for (const page of ['SiteStudio', 'MakerArea', 'AdminArea']) {
  const key = `src/pages/${page}.tsx`;
  assert.ok(manifest[key]?.isDynamicEntry, `${page} must have a dynamic route entry`);
  assert.ok(!eager.has(key), `${page} must not be in the public static import graph`);
  const bytes = readFileSync(path.join(output, manifest[key].file));
  console.log(`${page}: ${bytes.length} bytes, gzip ${gzipSync(bytes).length} bytes (on demand)`);
}
let size = 0;
let compressed = 0;
for (const key of eager) {
  const filename = path.join(output, manifest[key].file);
  if (!filename.endsWith('.js')) continue;
  size += statSync(filename).size;
  compressed += gzipSync(readFileSync(filename)).length;
}
console.log(`Initial public JavaScript: ${size} bytes, gzip ${compressed} bytes`);
console.log('PASS: private route chunks excluded from all eager imports.');
