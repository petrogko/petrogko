import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sunTimes, phaseAt } from '../src/sky/phase.js';
import { moonAt } from '../src/sky/moon.js';
import { seasonAt } from '../src/sky/season.js';
import { weatherKind } from '../src/sky/weather.js';
import { skyState } from '../src/sky/index.js';
import { formatClock, formatShortDate } from '../src/time.js';
import { config } from '../src/config.js';

const LOC = config.location;
const TZ = LOC.timeZone;
const MIN = 60_000;

test('sunTimes matches the real Toronto sunrise and sunset', () => {
  const { sunrise, sunset } = sunTimes(new Date('2026-10-01T19:40:00Z'), LOC);
  assert.equal(formatClock(sunrise, TZ), '07:15');
  assert.equal(formatClock(sunset, TZ), '18:58');
});

test('sunTimes picks the Toronto calendar day on DST-change days', () => {
  for (const iso of ['2026-03-08T06:30:00Z', '2026-03-08T17:00:00Z', '2026-11-01T05:30:00Z', '2026-11-01T17:00:00Z']) {
    const now = new Date(iso);
    const { sunrise, sunset } = sunTimes(now, LOC);
    assert.equal(formatShortDate(sunrise, TZ), formatShortDate(now, TZ), iso);
    const hours = (sunset - sunrise) / 3_600_000;
    assert.ok(hours > 10 && hours < 12, `${iso}: ${hours}h`);
  }
});

test('phaseAt boundaries are [rise-60, rise+60) dawn, [rise+60, set-60) day, [set-60, set+60) dusk', () => {
  const sun = { sunrise: new Date('2026-10-01T11:15:00Z'), sunset: new Date('2026-10-01T22:58:00Z') };
  const at = (base, minutes) => phaseAt(new Date(base.getTime() + minutes * MIN), sun);
  assert.equal(at(sun.sunrise, -61), 'night');
  assert.equal(at(sun.sunrise, -60), 'dawn');
  assert.equal(at(sun.sunrise, 59), 'dawn');
  assert.equal(at(sun.sunrise, 60), 'day');
  assert.equal(at(sun.sunset, -61), 'day');
  assert.equal(at(sun.sunset, -60), 'dusk');
  assert.equal(at(sun.sunset, 59), 'dusk');
  assert.equal(at(sun.sunset, 60), 'night');
});

test('skyState: summer noon is day, winter midnight is night', () => {
  assert.equal(skyState(new Date('2026-06-21T16:00:00Z'), LOC).phase, 'day');
  assert.equal(skyState(new Date('2026-12-21T05:00:00Z'), LOC).phase, 'night');
});

test('moonAt: new moon hidden, full moon visible, quarter waxing', () => {
  const fresh = moonAt(new Date('2026-10-10T18:00:00Z'));
  assert.ok(fresh.illumination < 0.03);
  assert.equal(fresh.visible, false);
  const full = moonAt(new Date('2026-10-26T06:00:00Z'));
  assert.ok(full.illumination > 0.97);
  assert.equal(full.visible, true);
  const quarter = moonAt(new Date('2026-10-18T12:00:00Z'));
  assert.equal(quarter.waxing, true);
  assert.ok(Math.abs(quarter.illumination - 0.5) < 0.05);
});

test('seasonAt maps months to seasons', () => {
  const s = iso => seasonAt(new Date(iso), TZ).season;
  assert.equal(s('2026-01-15T17:00:00Z'), 'winter');
  assert.equal(s('2026-04-15T17:00:00Z'), 'spring');
  assert.equal(s('2026-07-15T17:00:00Z'), 'summer');
  assert.equal(s('2026-10-15T17:00:00Z'), 'autumn');
  assert.equal(s('2026-12-15T17:00:00Z'), 'winter');
});

test('seasonAt holidays use the Toronto date, not UTC', () => {
  const h = iso => seasonAt(new Date(iso), TZ).holiday;
  assert.equal(h('2026-10-31T17:00:00Z'), 'halloween');
  assert.equal(h('2026-11-01T02:00:00Z'), 'halloween'); // 22:00 EDT Oct 31
  assert.equal(h('2026-11-01T05:00:00Z'), null); // 01:00 EDT Nov 1
  assert.equal(h('2026-12-31T17:00:00Z'), 'newyear');
  assert.equal(h('2027-01-01T17:00:00Z'), 'newyear');
  assert.equal(h('2026-07-01T17:00:00Z'), 'canadaday');
  assert.equal(h('2026-07-02T03:00:00Z'), 'canadaday'); // 23:00 EDT Jul 1
  assert.equal(h('2026-08-01T17:00:00Z'), null);
});

test('weatherKind maps OpenWeather condition ids', () => {
  assert.equal(weatherKind(null), 'none');
  assert.equal(weatherKind(800), 'clear');
  assert.equal(weatherKind(801), 'light-clouds');
  assert.equal(weatherKind(802), 'light-clouds');
  assert.equal(weatherKind(803), 'dense-clouds');
  assert.equal(weatherKind(804), 'dense-clouds');
  assert.equal(weatherKind(741), 'dense-clouds');
  assert.equal(weatherKind(211), 'rain');
  assert.equal(weatherKind(311), 'rain');
  assert.equal(weatherKind(502), 'rain');
  assert.equal(weatherKind(601), 'snow');
  assert.equal(weatherKind(999), 'none');
});
