import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zonedParts, utcOffsetMinutes, formatClock, formatShortDate, formatStamp } from '../src/time.js';

const TZ = 'America/Toronto';

test('zonedParts reads the Toronto wall clock', () => {
  assert.deepEqual(zonedParts(new Date('2026-10-01T19:17:00Z'), TZ), {
    year: 2026,
    month: 10,
    day: 1,
    hour: 15,
    minute: 17,
    weekday: 'Thu',
  });
});

test('utcOffsetMinutes follows daylight saving time', () => {
  assert.equal(utcOffsetMinutes(new Date('2026-07-01T12:00:00Z'), TZ), -240);
  assert.equal(utcOffsetMinutes(new Date('2026-12-21T12:00:00Z'), TZ), -300);
});

test('formatClock uses a 00-23 hour cycle', () => {
  assert.equal(formatClock(new Date('2026-10-01T04:05:00Z'), TZ), '00:05');
  assert.equal(formatClock(new Date('2026-10-01T22:58:00Z'), TZ), '18:58');
});

test('formatShortDate uses the Toronto calendar day, not UTC', () => {
  assert.equal(formatShortDate(new Date('2026-10-01T02:00:00Z'), TZ), 'Sep 30');
  assert.equal(formatShortDate(new Date('2026-10-01T12:00:00Z'), TZ), 'Oct 1');
});

test('formatStamp includes weekday, date, time and zone', () => {
  assert.equal(formatStamp(new Date('2026-10-01T19:17:00Z'), TZ), 'Thu 1 Oct, 15:17 EDT');
  assert.equal(formatStamp(new Date('2026-12-21T17:00:00Z'), TZ), 'Mon 21 Dec, 12:00 EST');
});
