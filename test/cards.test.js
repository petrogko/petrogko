import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderWeatherCard,
  renderStatsCard,
  renderFeaturedCard,
  renderSkills,
  renderButton,
} from '../src/render/cards.js';
import { findXmlError } from '../src/render/xml.js';
import { config } from '../src/config.js';
import { SAMPLE } from '../scripts/sample-data.js';
import { matchSnapshot } from './helpers/snapshot.js';

const TZ = config.location.timeZone;
const THEMES = ['dark', 'light'];

for (const theme of THEMES) {
  test(`cards (${theme}) are well-formed and stable`, () => {
    const cards = {
      weather: renderWeatherCard({ theme, weather: SAMPLE.weather, sky: SAMPLE.sky, timeZone: TZ, city: 'Toronto' }),
      'weather-unavailable': renderWeatherCard({ theme, weather: null, sky: SAMPLE.sky, timeZone: TZ, city: 'Toronto' }),
      stats: renderStatsCard({
        theme,
        stats: SAMPLE.github.stats,
        languages: SAMPLE.github.languages,
        stamp: 'Thu 1 Oct, 15:17 EDT',
      }),
      featured: renderFeaturedCard({ theme, repo: SAMPLE.github.featured[0] }),
      skills: renderSkills({ theme, skills: config.skills }),
      button: renderButton({ theme, icon: '🌐', label: 'petrogko.com' }),
    };
    for (const [name, svg] of Object.entries(cards)) {
      assert.equal(findXmlError(svg), null, name);
      matchSnapshot(`card-${name}-${theme}.svg`, svg);
    }
  });
}

test('weather card shows rounded temperature, sentence-case description and sun times', () => {
  const svg = renderWeatherCard({ theme: 'dark', weather: SAMPLE.weather, sky: SAMPLE.sky, timeZone: TZ, city: 'Toronto' });
  assert.ok(svg.includes('>14°<'));
  assert.ok(svg.includes('>Few clouds<'));
  assert.ok(svg.includes('feels like 13°'));
  assert.ok(svg.includes('☀︎ 07:15  ·  ☾ 18:58'));
  assert.ok(svg.includes('TORONTO NOW'));
});

test('weather card unavailable state keeps sun times', () => {
  const svg = renderWeatherCard({ theme: 'light', weather: null, sky: SAMPLE.sky, timeZone: TZ, city: 'Toronto' });
  assert.ok(svg.includes('Toronto · weather unavailable'));
  assert.ok(svg.includes('☀︎ 07:15'));
});

test('stats card shows dashes without data and the update stamp', () => {
  const svg = renderStatsCard({ theme: 'dark', stats: null, languages: [], stamp: 'Thu 1 Oct, 15:17 EDT' });
  assert.equal((svg.match(/>–</g) ?? []).length, 3);
  assert.ok(svg.includes('updated Thu 1 Oct, 15:17 EDT'));
  assert.ok(svg.includes('no language data'));
});

test('stats card legend lists the top four languages', () => {
  const svg = renderStatsCard({
    theme: 'dark',
    stats: SAMPLE.github.stats,
    languages: SAMPLE.github.languages,
    stamp: 'x',
  });
  assert.ok(svg.includes('html · javascript · php · css'));
  assert.ok(!svg.includes('python'));
});

test('featured card escapes markup and hard-wraps long tokens', () => {
  const svg = renderFeaturedCard({
    theme: 'dark',
    repo: {
      name: 'x',
      title: 'Tom & <Jerry>',
      description: `Uses "quotes" & <b>tags</b> plus ${'a'.repeat(60)} end`,
      url: 'https://example.com',
    },
  });
  assert.equal(findXmlError(svg), null);
  assert.ok(svg.includes('Tom &amp; &lt;Jerry&gt;'));
  assert.ok(svg.includes('&quot;quotes&quot; &amp; &lt;b&gt;tags&lt;/b&gt;'));
  assert.ok(svg.includes(`>${'a'.repeat(52)}<`));
});

test('featured card art is deterministic per repo name', () => {
  const a = renderFeaturedCard({ theme: 'dark', repo: SAMPLE.github.featured[0] });
  const b = renderFeaturedCard({ theme: 'dark', repo: SAMPLE.github.featured[0] });
  const c = renderFeaturedCard({ theme: 'dark', repo: SAMPLE.github.featured[1] });
  assert.equal(a, b);
  assert.notEqual(a.match(/<polyline[^>]*>/)[0], c.match(/<polyline[^>]*>/)[0]);
});
