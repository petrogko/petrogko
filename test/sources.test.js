import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchJson, HttpError } from '../src/sources/http.js';
import { fetchWeather, MissingKeyError } from '../src/sources/weather.js';
import { fetchGithub, mapEvents, humanize } from '../src/sources/github.js';
import { fakeFetch, reply } from './helpers/fakeFetch.js';
import { githubRoutes, EVENTS } from './fixtures/github.js';

const TZ = 'America/Toronto';
const WEATHER_PATH = '/data/2.5/weather?lat=43.6532&lon=-79.3832&units=metric&appid=SECRET';
const OW = { main: { temp: 14.4, feels_like: 13.2 }, weather: [{ id: 801, description: 'few clouds' }] };
const gh = fetch =>
  fetchGithub({ fetch, token: 't', user: 'petrogko', excludeRepos: [], featuredTopic: 'featured', maxFeatured: 4, activityLimit: 5, timeZone: TZ });

test('fetchJson retries once, then succeeds', async () => {
  let n = 0;
  const f = fakeFetch({ '/x': () => (++n === 1 ? reply(502) : { ok: 1 }) });
  assert.deepEqual(await fetchJson(f, 'https://h/x'), { ok: 1 });
  assert.equal(f.calls.length, 2);
});

test('fetchJson gives up after one retry with HttpError', async () => {
  const f = fakeFetch({ '/x': reply(500) });
  await assert.rejects(fetchJson(f, 'https://h/x'), err => err instanceof HttpError && err.status === 500);
  assert.equal(f.calls.length, 2);
});

test('fetchJson redacts appid from error messages', async () => {
  const f = fakeFetch({ [WEATHER_PATH]: reply(401) });
  await assert.rejects(fetchJson(f, `https://api.openweathermap.org${WEATHER_PATH}`), err => {
    assert.ok(!err.message.includes('SECRET'), err.message);
    assert.ok(err.message.includes('appid=***'));
    return true;
  });
});

test('fetchWeather maps the OpenWeather response', async () => {
  const f = fakeFetch({ [WEATHER_PATH]: OW });
  assert.deepEqual(await fetchWeather({ fetch: f, apiKey: 'SECRET', lat: 43.6532, lon: -79.3832 }), {
    temp: 14.4,
    feelsLike: 13.2,
    conditionId: 801,
    description: 'few clouds',
  });
});

test('fetchWeather without a key throws MissingKeyError and makes no request', async () => {
  const f = fakeFetch({});
  await assert.rejects(fetchWeather({ fetch: f, apiKey: '', lat: 1, lon: 2 }), MissingKeyError);
  assert.equal(f.calls.length, 0);
});

test('fetchWeather rejects an unexpected shape', async () => {
  const f = fakeFetch({ [WEATHER_PATH]: { cod: 200 } });
  await assert.rejects(fetchWeather({ fetch: f, apiKey: 'SECRET', lat: 43.6532, lon: -79.3832 }), /Unexpected/);
});

test('fetchGithub aggregates public non-fork data', async () => {
  const data = await gh(fakeFetch(githubRoutes()));
  assert.deepEqual(data.languages, [
    { name: 'HTML', bytes: 17000 },
    { name: 'Go', bytes: 1500 },
    { name: 'JavaScript', bytes: 1000 },
    { name: 'CSS', bytes: 500 },
  ]);
  assert.deepEqual(data.stats, { publicRepos: 96, stars: 3, followers: 10 });
  assert.deepEqual(
    data.featured.map(f => [f.name, f.title, f.url]),
    [
      ['politics-history-timeline', 'Politics History Timeline', 'https://github.com/petrogko/politics-history-timeline'],
      ['religion-history-timeline', 'Religion History Timeline', 'https://petrogko.com/religion-history-timeline/'],
    ]
  );
  assert.equal(data.activity.length, 5);
});

test('fetchGithub fails as a whole when any languages call fails', async () => {
  const f = fakeFetch(githubRoutes({ '/repos/petrogko/grpc-example/languages': reply(500) }));
  await assert.rejects(gh(f), HttpError);
});

test('fetchGithub caps featured repos at maxFeatured', async () => {
  const data = await fetchGithub({
    fetch: fakeFetch(githubRoutes()),
    token: '',
    user: 'petrogko',
    excludeRepos: [],
    featuredTopic: 'featured',
    maxFeatured: 1,
    activityLimit: 5,
    timeZone: TZ,
  });
  assert.deepEqual(data.featured.map(f => f.name), ['politics-history-timeline']);
});

test('mapEvents maps, dedupes per day, ignores noise, and respects the limit', () => {
  assert.deepEqual(mapEvents(EVENTS, { user: 'petrogko', timeZone: TZ, limit: 10 }), [
    { emoji: '🚀', verb: 'Pushed to', target: 'politics-history-timeline', url: 'https://github.com/petrogko/politics-history-timeline', date: 'Oct 1' },
    { emoji: '⭐', verb: 'Starred', target: 'nvk/llm-wiki', url: 'https://github.com/nvk/llm-wiki', date: 'Sep 27' },
    { emoji: '🔀', verb: 'Opened a pull request in', target: 'osiris', url: 'https://github.com/petrogko/osiris', date: 'Sep 23' },
    { emoji: '✅', verb: 'Merged a pull request in', target: 'osiris', url: 'https://github.com/petrogko/osiris', date: 'Sep 22' },
    { emoji: '🏷️', verb: 'Released v1.2.0 of', target: 'grpc-example', url: 'https://github.com/petrogko/grpc-example', date: 'Sep 19' },
    { emoji: '🍴', verb: 'Forked', target: 'simplifaisoul/osiris', url: 'https://github.com/simplifaisoul/osiris', date: 'Sep 18' },
  ]);
  assert.equal(mapEvents(EVENTS, { user: 'petrogko', timeZone: TZ, limit: 2 }).length, 2);
});

test('release date uses the Toronto calendar day (03:00Z → previous day)', () => {
  const [release] = mapEvents([EVENTS[7]], { user: 'petrogko', timeZone: TZ, limit: 5 });
  assert.equal(release.date, 'Sep 19');
});

test('merged pull requests are detected in the legacy payload shape too', () => {
  const legacy = { type: 'PullRequestEvent', repo: { name: 'petrogko/x' }, payload: { action: 'closed', pull_request: { merged: true } }, created_at: '2026-09-01T12:00:00Z' };
  assert.equal(mapEvents([legacy], { user: 'petrogko', timeZone: TZ, limit: 5 })[0].verb, 'Merged a pull request in');
});

test('humanize turns repo slugs into titles', () => {
  assert.equal(humanize('religion-history-timeline'), 'Religion History Timeline');
  assert.equal(humanize('grpc_example'), 'Grpc Example');
});
