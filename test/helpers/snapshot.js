import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';

const DIR = new URL('../__snapshots__/', import.meta.url);

/** Compares `actual` to test/__snapshots__/<name>. UPDATE_SNAPSHOTS=1 rewrites; missing files are created locally but fail in CI. */
export function matchSnapshot(name, actual) {
  const file = new URL(name, DIR);
  const exists = existsSync(file);
  if (!exists && process.env.CI) assert.fail(`missing snapshot ${name}; run UPDATE_SNAPSHOTS=1 npm test locally`);
  if (!exists || process.env.UPDATE_SNAPSHOTS === '1') {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(file, actual);
    return;
  }
  assert.equal(actual, readFileSync(file, 'utf8'), `snapshot ${name} changed; run UPDATE_SNAPSHOTS=1 npm test if intended`);
}
