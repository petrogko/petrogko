import { getTimes } from 'suncalc';
import { utcOffsetMinutes } from '../time.js';

const HOUR = 3_600_000;

/** Sunrise and sunset for the local calendar day (in `timeZone`) that contains `now`. */
export function sunTimes(now, { lat, lon, timeZone }) {
  const t = getTimes(now, lat, lon, 0, utcOffsetMinutes(now, timeZone));
  return { sunrise: t.sunrise, sunset: t.sunset };
}

export function phaseAt(now, { sunrise, sunset }) {
  const t = now.getTime();
  const rise = sunrise.getTime();
  const set = sunset.getTime();
  if (t >= rise - HOUR && t < rise + HOUR) return 'dawn';
  if (t >= rise + HOUR && t < set - HOUR) return 'day';
  if (t >= set - HOUR && t < set + HOUR) return 'dusk';
  return 'night';
}
