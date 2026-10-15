import { zonedParts } from '../time.js';

export function seasonAt(now, timeZone) {
  const { month, day } = zonedParts(now, timeZone);
  const season =
    month === 12 || month <= 2 ? 'winter' : month <= 5 ? 'spring' : month <= 8 ? 'summer' : 'autumn';
  let holiday = null;
  if (month === 10 && day === 31) holiday = 'halloween';
  else if ((month === 12 && day === 31) || (month === 1 && day === 1)) holiday = 'newyear';
  else if (month === 7 && day === 1) holiday = 'canadaday';
  return { season, holiday };
}
