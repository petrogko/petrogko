import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readLastGood, freshWeather, anyGithub, writeLastGood } from '../src/lastGood.js';

const dir = () => mkdtempSync(join(tmpdir(), 'lastgood-'));
const NOW = new Date('2026-10-01T19:17:00Z');
const hoursAgo = h => new Date(NOW.getTime() - h * 3_600_000).toISOString();

test('missing file → empty record', () => {
  assert.deepEqual(readLastGood(join(dir(), 'nope.json')), {});
});

test('corrupt, truncated or non-object JSON → empty record', () => {
  const d = dir();
  for (const [name, content] of [
    ['a.json', '{"weather": {'],
    ['b.json', ''],
    ['c.json', '[1,2]'],
    ['d.json', 'null'],
  ]) {
    writeFileSync(join(d, name), content);
    assert.deepEqual(readLastGood(join(d, name)), {}, name);
  }
});

test('freshWeather accepts up to 6h, rejects older, future or missing', () => {
  const at = fetchedAt => ({ weather: { data: { temp: 1 }, fetchedAt } });
  assert.deepEqual(freshWeather(at(hoursAgo(2)), NOW), { temp: 1 });
  assert.deepEqual(freshWeather(at(hoursAgo(6)), NOW), { temp: 1 });
  assert.equal(freshWeather(at(hoursAgo(6.01)), NOW), null);
  assert.equal(freshWeather(at(hoursAgo(-1)), NOW), null);
  assert.equal(freshWeather({}, NOW), null);
});

test('anyGithub has no age limit', () => {
  assert.deepEqual(anyGithub({ github: { data: { a: 1 }, fetchedAt: '2020-01-01T00:00:00Z' } }), { a: 1 });
  assert.equal(anyGithub({}), null);
});

test('writeLastGood creates directories and round-trips', () => {
  const file = join(dir(), 'data', 'last-good.json');
  const record = { weather: { data: { temp: 3 }, fetchedAt: NOW.toISOString() } };
  writeLastGood(file, record);
  assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), record);
  assert.deepEqual(readLastGood(file), record);
});
