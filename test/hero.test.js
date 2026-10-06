import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderHero, moonPath } from '../src/render/hero.js';
import { layoutConstellation, SLOTS } from '../src/render/constellation.js';
import { findXmlError } from '../src/render/xml.js';
import { config } from '../src/config.js';
import { SAMPLE } from '../scripts/sample-data.js';
import { matchSnapshot } from './helpers/snapshot.js';

const constellation = layoutConstellation(SAMPLE.github.languages, config.toolStars);
const hero = (sky = {}, extra = {}) =>
  renderHero({
    theme: 'dark',
    sky: { ...SAMPLE.sky, ...sky },
    weatherId: null,
    constellation,
    greeting: config.greeting,
    taglines: config.taglines,
    location: 'Toronto',
    ...extra,
  });

const PHASES = ['dawn', 'day', 'dusk', 'night'];
const WEATHER = { none: null, clear: 800, 'light-clouds': 801, 'dense-clouds': 804, rain: 501, snow: 601 };

for (const phase of PHASES) {
  for (const [kind, weatherId] of Object.entries(WEATHER)) {
    test(`hero ${phase} × ${kind} is well-formed and stable`, () => {
      const svg = hero({ phase }, { weatherId });
      assert.equal(findXmlError(svg), null);
      matchSnapshot(`hero-${phase}-${kind}.svg`, svg);
    });
  }
}

for (const holiday of ['halloween', 'newyear', 'canadaday']) {
  test(`hero night × ${holiday} is well-formed and stable`, () => {
    const svg = hero({ phase: 'night', holiday, season: holiday === 'canadaday' ? 'summer' : 'autumn' });
    assert.equal(findXmlError(svg), null);
    matchSnapshot(`hero-night-${holiday}.svg`, svg);
  });
}

test('hero autumn day is well-formed and stable', () => {
  const svg = hero({ phase: 'day', season: 'autumn' }, { weatherId: 800 });
  assert.equal(findXmlError(svg), null);
  matchSnapshot('hero-day-autumn.svg', svg);
});

test('uses CSS animation only, no SMIL or external references', () => {
  for (const phase of PHASES) {
    const svg = hero({ phase }, { weatherId: 501 });
    assert.ok(!svg.includes('<animate'), phase);
    assert.ok(!svg.includes('href'), phase);
    assert.ok(!svg.includes('<image'), phase);
    assert.ok(svg.includes('prefers-reduced-motion'), phase);
  }
});

test('day: dashed constellation, nothing twinkles', () => {
  const svg = hero({ phase: 'day' });
  assert.ok(svg.includes('stroke-dasharray="3 4"'));
  assert.ok(!svg.includes('class="tw'));
});

test('night: aurora and visible moon; hidden at new moon', () => {
  const svg = hero({ phase: 'night' });
  assert.ok(svg.includes('id="aurora"'));
  assert.ok(svg.includes('fill="#f3f0e0"'));
  const dark = hero({ phase: 'night', moon: { phase: 0, illumination: 0.01, waxing: true, visible: false } });
  assert.ok(!dark.includes('fill="#f3f0e0"'));
});

test('holidays: orange moon even by day, fireworks, red-and-white aurora', () => {
  assert.ok(hero({ phase: 'day', holiday: 'halloween' }).includes('#ff9a3c'));
  assert.ok(hero({ phase: 'night', holiday: 'newyear' }).includes('class="burst b0"'));
  const canada = hero({ phase: 'night', holiday: 'canadaday' });
  assert.ok(canada.includes('stop-color: #d52b1e'));
});

test('autumn leaves fall unless it rains or snows; holidays override the season', () => {
  assert.ok(hero({ season: 'autumn' }, { weatherId: 800 }).includes('class="leaves"'));
  assert.ok(!hero({ season: 'autumn' }, { weatherId: 501 }).includes('class="leaves"'));
  assert.ok(!hero({ season: 'autumn' }, { weatherId: 601 }).includes('class="leaves"'));
  assert.ok(!hero({ season: 'autumn', holiday: 'halloween' }, { weatherId: 800 }).includes('class="leaves"'));
});

test('wave edge matches the page theme', () => {
  assert.ok(hero().includes('fill="#0d1117"/></svg>'));
  assert.ok(hero({}, { theme: 'light' }).includes('fill="#ffffff"/></svg>'));
});

test('taglines rotate and are escaped', () => {
  const svg = hero();
  assert.ok(svg.includes('Solutions &amp; DevOps Engineer · Toronto'));
  assert.ok(svg.includes('class="tl tl3"'));
  assert.ok(svg.includes('@keyframes cycle'));
  const single = hero({}, { taglines: ['Only one'] });
  assert.ok(!single.includes('class="tl'));
});

test('first tagline shows without animation (static renders) and the cycle starts visible', () => {
  const svg = hero();
  assert.ok(svg.includes('.tl0 { opacity: 1; animation-delay: 0s; }'));
  assert.ok(svg.includes('.tl1 { opacity: 0; animation-delay: -9s; }'));
  assert.match(svg, /@keyframes cycle \{ 0% \{ opacity: 1; \}/);
});

test('day sun stays clear of the constellation', () => {
  const svg = hero({ phase: 'day' });
  const [cx, cy, r] = svg.match(/<circle cx="(\d+)" cy="(\d+)" r="(\d+)" fill="#fffdf2"\/>/).slice(1).map(Number);
  for (const s of SLOTS) assert.ok(Math.hypot(s.x - cx, s.y - cy) > r + 30, `slot ${s.x},${s.y}`);
});

test('dawn and dusk sun discs rise above the wave edge', () => {
  for (const phase of ['dawn', 'dusk']) {
    const svg = hero({ phase });
    const [cy, r] = svg.match(/<circle cx="\d+" cy="(\d+)" r="(\d+)" fill="#ff[0-9a-f]{4}"\/>/).slice(1).map(Number);
    assert.ok(cy - r <= 190, `${phase}: disc top at ${cy - r}`);
  }
});

test('moonPath: half moon has a straight terminator; waxing lights the right side', () => {
  assert.equal(moonPath(10, 10, 5, { illumination: 0.5, waxing: true }), 'M10 5 A5 5 0 0 1 10 15 A0 5 0 0 1 10 5Z');
  assert.equal(moonPath(10, 10, 5, { illumination: 0.25, waxing: false }), 'M10 5 A5 5 0 0 0 10 15 A2.5 5 0 0 1 10 5Z');
});
