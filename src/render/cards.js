import {
  escapeXml,
  wrapText,
  hashString,
  seededRandom,
  hslToHex,
  svgDoc,
  THEMES,
  FONT_SANS,
  TWINKLE_CSS,
} from './svg.js';
import { weatherKind } from '../sky/weather.js';
import { formatClock } from '../time.js';

const r1 = n => Math.round(n * 10) / 10;

const LANG_COLORS = {
  HTML: '#e34c26',
  JavaScript: '#f1e05a',
  PHP: '#4f5d95',
  CSS: '#663399',
  Go: '#00add8',
  Python: '#3572a5',
  TypeScript: '#3178c6',
  Shell: '#89e051',
  Java: '#b07219',
  'C++': '#f34b7d',
  Mustache: '#724b3b',
  Makefile: '#427819',
};

const GLYPHS = {
  clear: { day: '☀️', night: '🌙' },
  'light-clouds': { day: '🌤️', night: '☁️' },
  'dense-clouds': { day: '☁️', night: '☁️' },
  rain: { day: '🌧️', night: '🌧️' },
  snow: { day: '❄️', night: '❄️' },
};

function cardFrame({ theme, width, height, title, inner, style = '' }) {
  const t = THEMES[theme];
  const body =
    `<defs><linearGradient id="card" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.cardFrom}"/><stop offset="1" stop-color="${t.cardTo}"/></linearGradient></defs>` +
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="12" fill="url(#card)"/>` +
    `<g font-family="${FONT_SANS}">${inner}</g>` +
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="12" fill="none" stroke="${t.border}"/>`;
  return svgDoc({ width, height, title, style, body });
}

const sentenceCase = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

export function renderWeatherCard({ theme, weather, sky, timeZone, city }) {
  const t = THEMES[theme];
  const sunLine = `☀︎ ${formatClock(sky.sunrise, timeZone)}  ·  ☾ ${formatClock(sky.sunset, timeZone)}`;
  const label = `<text x="20" y="30" font-size="11" letter-spacing="1.2" fill="${t.muted}">${escapeXml(city.toUpperCase())} NOW</text>`;
  let main;
  let icon = '';
  if (weather) {
    const temp = `${Math.round(weather.temp)}°`;
    const kind = weatherKind(weather.conditionId);
    const glyph = GLYPHS[kind]?.[sky.phase === 'night' ? 'night' : 'day'];
    main =
      `<text x="20" y="78" font-size="36" font-weight="700" fill="${t.text}">${escapeXml(temp)}</text>` +
      `<text x="${20 + [...temp].length * 21 + 10}" y="78" font-size="14" fill="${t.muted}">${escapeXml(sentenceCase(weather.description))}</text>` +
      `<text x="20" y="102" font-size="12" fill="${t.muted}">feels like ${Math.round(weather.feelsLike)}°</text>`;
    if (glyph) icon = `<text x="345" y="88" text-anchor="middle" font-size="40">${glyph}</text>`;
  } else {
    main = `<text x="20" y="78" font-size="18" fill="${t.text}">${escapeXml(city)} · weather unavailable</text>`;
  }
  const footer = `<text x="20" y="126" font-size="12" fill="${t.muted}">${escapeXml(sunLine)}</text>`;
  return cardFrame({ theme, width: 400, height: 140, title: `${city} weather`, inner: label + main + footer + icon });
}

export function renderStatsCard({ theme, stats, languages, stamp }) {
  const t = THEMES[theme];
  const show = v => (typeof v === 'number' ? String(v) : '–');
  const columns = [
    ['repos', stats?.publicRepos],
    ['stars', stats?.stars],
    ['followers', stats?.followers],
  ];
  const numbers = columns
    .map(
      ([label, value], i) =>
        `<text x="${20 + i * 120}" y="68" font-size="26" font-weight="700" fill="${t.text}">${show(value)}</text>` +
        `<text x="${20 + i * 120}" y="86" font-size="11" fill="${t.muted}">${label}</text>`
    )
    .join('');
  const top = languages.slice(0, 4);
  const sum = top.reduce((s, l) => s + l.bytes, 0);
  let x = 20;
  const segments = sum
    ? top
        .map((l, i) => {
          const w = i === top.length - 1 ? 380 - x : (l.bytes / sum) * 360;
          const seg = `<rect x="${r1(x)}" y="98" width="${r1(Math.max(w, 0))}" height="6" fill="${LANG_COLORS[l.name] ?? '#8b9bd0'}"/>`;
          x += w;
          return seg;
        })
        .join('')
    : `<rect x="20" y="98" width="360" height="6" fill="${t.border}"/>`;
  const bar = `<defs><clipPath id="bar"><rect x="20" y="98" width="360" height="6" rx="3"/></clipPath></defs><g clip-path="url(#bar)">${segments}</g>`;
  const legend = top.length ? top.map(l => l.name.toLowerCase()).join(' · ') : 'no language data';
  const inner =
    `<text x="20" y="30" font-size="11" letter-spacing="1.2" fill="${t.muted}">GITHUB</text>` +
    `<text x="380" y="30" text-anchor="end" font-size="10" fill="${t.muted}">updated ${escapeXml(stamp)}</text>` +
    numbers +
    bar +
    `<text x="20" y="124" font-size="11" fill="${t.muted}">${escapeXml(legend)}</text>`;
  return cardFrame({ theme, width: 400, height: 140, title: 'GitHub stats and top languages', inner });
}

export function renderFeaturedCard({ theme, repo }) {
  const t = THEMES[theme];
  const seed = hashString(repo.name);
  const rand = seededRandom(seed);
  const hue = seed % 360;
  const points = Array.from({ length: 7 }, (_, i) => [r1(30 + i * 56 + rand() * 20), r1(16 + rand() * 36)]);
  const radii = points.map(() => r1(1.8 + rand() * 1.6));
  const art =
    `<defs><linearGradient id="art" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hslToHex(hue, 55, 24)}"/><stop offset="1" stop-color="#0b1026"/></linearGradient>` +
    `<clipPath id="top"><rect x="0.5" y="0.5" width="399" height="159" rx="12"/></clipPath></defs>` +
    `<g clip-path="url(#top)"><rect width="400" height="64" fill="url(#art)"/>` +
    `<polyline points="${points.map(p => p.join(',')).join(' ')}" fill="none" stroke="${hslToHex(hue, 90, 80)}" stroke-opacity="0.55" stroke-width="1"/>` +
    points.map(([x, y], i) => `<circle class="tw${i % 3}" cx="${x}" cy="${y}" r="${radii[i]}" fill="#f0f4ff"/>`).join('') +
    '</g>';
  const title = `<text x="20" y="90" font-size="15" font-weight="700" fill="${t.text}">${escapeXml(repo.title)}</text>`;
  const lines = wrapText(repo.description, 52, 3)
    .map((line, i) => `<text x="20" y="${112 + i * 16}" font-size="12" fill="${t.muted}">${escapeXml(line)}</text>`)
    .join('');
  return cardFrame({
    theme,
    width: 400,
    height: 160,
    title: `${repo.title}: ${repo.description}`,
    inner: art + title + lines,
    style: TWINKLE_CSS,
  });
}

export function renderSkills({ theme, skills }) {
  const t = THEMES[theme];
  const gap = 8;
  const widths = skills.map(s => Math.round(44 + [...s.label].length * 7.4));
  const total = widths.reduce((a, b) => a + b, 0) + gap * (skills.length - 1);
  let x = Math.max(0, Math.round((800 - total) / 2));
  const pills = skills
    .map((s, i) => {
      const w = widths[i];
      const pill =
        `<rect x="${x + 0.5}" y="4.5" width="${w - 1}" height="27" rx="13.5" fill="${t.pillBg}" stroke="${t.pillBorder}"/>` +
        `<text x="${x + 14}" y="23" font-size="13">${escapeXml(s.icon)}</text>` +
        `<text x="${x + 34}" y="22.5" font-family="${FONT_SANS}" font-size="13" fill="${t.pillText}">${escapeXml(s.label)}</text>`;
      x += w + gap;
      return pill;
    })
    .join('');
  return svgDoc({ width: 800, height: 36, title: `Skills: ${skills.map(s => s.label).join(', ')}`, body: pills });
}

export function renderButton({ theme, icon, label }) {
  const t = THEMES[theme];
  return svgDoc({
    width: 180,
    height: 36,
    title: label,
    body:
      `<rect x="0.5" y="0.5" width="179" height="35" rx="8" fill="${t.pillBg}" stroke="${t.border}"/>` +
      `<text x="90" y="23" text-anchor="middle" font-family="${FONT_SANS}" font-size="13" fill="${t.pillText}">${escapeXml(`${icon} ${label}`)}</text>`,
  });
}
