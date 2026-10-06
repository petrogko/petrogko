import { sunTimes, phaseAt } from './phase.js';
import { moonAt } from './moon.js';
import { seasonAt } from './season.js';

export function skyState(now, location) {
  const sun = sunTimes(now, location);
  return { phase: phaseAt(now, sun), ...sun, moon: moonAt(now), ...seasonAt(now, location.timeZone) };
}
