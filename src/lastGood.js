import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const WEATHER_MAX_AGE_MS = 6 * 3_600_000;

export function readLastGood(path) {
  try {
    const value = JSON.parse(readFileSync(path, 'utf8'));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

export function freshWeather(lastGood, now, maxAgeMs = WEATHER_MAX_AGE_MS) {
  const entry = lastGood.weather;
  if (!entry?.data || !entry.fetchedAt) return null;
  const age = now.getTime() - Date.parse(entry.fetchedAt);
  return age >= 0 && age <= maxAgeMs ? entry.data : null;
}

export function anyGithub(lastGood) {
  return lastGood.github?.data ?? null;
}

export function writeLastGood(path, record) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`);
}
