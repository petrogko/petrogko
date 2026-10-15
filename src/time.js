const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = n => String(n).padStart(2, '0');

function zonePart(date, timeZone, timeZoneName) {
  return new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName })
    .formatToParts(date)
    .find(p => p.type === 'timeZoneName')?.value;
}

/** Calendar fields of `date` as shown on a wall clock in `timeZone`. */
export function zonedParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(date);
  const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    weekday: p.weekday,
  };
}

/** Minutes east of UTC in `timeZone` at `date` (EDT → -240). */
export function utcOffsetMinutes(date, timeZone) {
  const value = zonePart(date, timeZone, 'longOffset') ?? 'GMT';
  const m = value.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) return 0;
  const minutes = Number(m[2]) * 60 + Number(m[3]);
  return m[1] === '-' ? -minutes : minutes;
}

export function formatClock(date, timeZone) {
  const p = zonedParts(date, timeZone);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

export function formatShortDate(date, timeZone) {
  const p = zonedParts(date, timeZone);
  return `${MONTHS[p.month - 1]} ${p.day}`;
}

export function formatStamp(date, timeZone) {
  const p = zonedParts(date, timeZone);
  const zone = zonePart(date, timeZone, 'short');
  return `${p.weekday} ${p.day} ${MONTHS[p.month - 1]}, ${pad(p.hour)}:${pad(p.minute)} ${zone}`;
}
