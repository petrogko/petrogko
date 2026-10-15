import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from '../src/index.js';
import { fakeFetch, reply } from './helpers/fakeFetch.js';
import { githubRoutes } from './fixtures/github.js';

const NOW = new Date('2026-10-01T19:17:00Z');
const WEATHER_PATH = '/data/2.5/weather?lat=43.6532&lon=-79.3832&units=metric&appid=SECRET';
const OW = { main: { temp: 14.4, feels_like: 13.2 }, weather: [{ id: 801, description: 'few clouds' }] };

function setup({ routes = {}, env = { OPEN_WEATHER_MAP_KEY: 'SECRET', GITHUB_TOKEN: 't' }, lastGood } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'run-'));
  const lastGoodPath = join(dir, 'cache', 'last-good.json');
  if (lastGood !== undefined) {
    mkdirSync(join(dir, 'cache'), { recursive: true });
    writeFileSync(lastGoodPath, typeof lastGood === 'string' ? lastGood : JSON.stringify(lastGood));
  }
  const warnings = [];
  const fetchImpl = fakeFetch({ [WEATHER_PATH]: OW, ...githubRoutes(), ...routes });
  const opts = {
    now: NOW,
    fetchImpl,
    env,
    outDir: join(dir, 'dist'),
    readmePath: join(dir, 'README.md'),
    lastGoodPath,
    log: { warn: m => warnings.push(m), log: () => {} },
  };
  return { dir, opts, warnings, fetchImpl };
}

const read = (dir, ...p) => readFileSync(join(dir, ...p), 'utf8');

test('happy path writes every image, README and last-good', async () => {
  const { dir, opts, warnings } = setup();
  const summary = await run(opts);
  assert.equal(summary.weatherSource, 'live');
  assert.equal(summary.githubSource, 'live');
  for (const theme of ['dark', 'light']) {
    for (const name of ['hero', 'skills', 'weather', 'stats', 'btn-site', 'btn-linkedin', 'btn-coffee']) {
      assert.ok(existsSync(join(dir, 'dist', `${name}-${theme}.svg`)), `${name}-${theme}`);
    }
    assert.ok(existsSync(join(dir, 'dist', `featured-religion-history-timeline-${theme}.svg`)));
  }
  assert.ok(read(dir, 'dist', 'stats-dark.svg').includes('updated Thu 1 Oct, 15:17 EDT'));
  assert.ok(read(dir, 'README.md').includes('### ✦ Featured'));
  const lastGood = JSON.parse(read(dir, 'dist', 'data', 'last-good.json'));
  assert.equal(lastGood.weather.data.conditionId, 801);
  assert.equal(lastGood.weather.fetchedAt, NOW.toISOString());
  assert.equal(lastGood.github.data.stats.followers, 10);
  assert.deepEqual(warnings, []);
});

test('invalid weather key (401): run stays green, card says unavailable, key never logged', async () => {
  const { dir, opts, warnings } = setup({ routes: { [WEATHER_PATH]: reply(401) } });
  const summary = await run(opts);
  assert.equal(summary.weatherSource, 'none');
  assert.ok(read(dir, 'dist', 'weather-dark.svg').includes('Toronto · weather unavailable'));
  assert.ok(read(dir, 'dist', 'hero-dark.svg').includes('id="sky"'));
  assert.equal(warnings.length, 1);
  assert.ok(warnings[0].startsWith('::warning::weather'));
  assert.ok(!warnings.join('\n').includes('SECRET'));
});

test('missing weather key: no weather request at all', async () => {
  const { opts, fetchImpl } = setup({ env: { GITHUB_TOKEN: 't' } });
  const summary = await run(opts);
  assert.equal(summary.weatherSource, 'none');
  assert.ok(!fetchImpl.calls.some(u => u.includes('openweathermap')));
});

test('weather failure uses a fallback up to 6h old', async () => {
  const fetchedAt = new Date(NOW.getTime() - 2 * 3_600_000).toISOString();
  const { dir, opts } = setup({
    routes: { [WEATHER_PATH]: reply(503) },
    lastGood: { weather: { data: { temp: -3, feelsLike: -8, conditionId: 601, description: 'snow' }, fetchedAt } },
  });
  const summary = await run(opts);
  assert.equal(summary.weatherSource, 'fallback');
  assert.ok(read(dir, 'dist', 'weather-dark.svg').includes('>-3°<'));
  assert.equal(JSON.parse(read(dir, 'dist', 'data', 'last-good.json')).weather.fetchedAt, fetchedAt);
});

test('weather fallback older than 6h is ignored', async () => {
  const fetchedAt = new Date(NOW.getTime() - 7 * 3_600_000).toISOString();
  const { opts } = setup({
    routes: { [WEATHER_PATH]: reply(503) },
    lastGood: { weather: { data: { temp: -3, feelsLike: -8, conditionId: 601, description: 'snow' }, fetchedAt } },
  });
  assert.equal((await run(opts)).weatherSource, 'none');
});

test('github failure uses any-age fallback and still writes README', async () => {
  const { dir, opts } = setup({
    routes: { '/users/petrogko': reply(500) },
    lastGood: {
      github: {
        data: { languages: [], featured: [], stats: { publicRepos: 1, stars: 0, followers: 2 }, activity: [] },
        fetchedAt: '2020-01-01T00:00:00Z',
      },
    },
  });
  const summary = await run(opts);
  assert.equal(summary.githubSource, 'fallback');
  assert.ok(read(dir, 'README.md').includes('Quiet lately'));
});

test('github failure without fallback rejects and writes nothing', async () => {
  const { dir, opts } = setup({ routes: { '/users/petrogko': reply(500) } });
  await assert.rejects(run(opts), /GitHub data unavailable/);
  assert.ok(!existsSync(join(dir, 'dist')));
  assert.ok(!existsSync(join(dir, 'README.md')));
});

test('corrupt last-good file is treated as empty', async () => {
  const { opts } = setup({ lastGood: '{"weather": {' });
  const summary = await run(opts);
  assert.equal(summary.weatherSource, 'live');
});

test('README is identical for two runs an hour apart with the same data', async () => {
  const a = setup();
  const b = setup();
  await run(a.opts);
  await run({ ...b.opts, now: new Date(NOW.getTime() + 3_600_000) });
  assert.equal(read(a.dir, 'README.md'), read(b.dir, 'README.md'));
});
