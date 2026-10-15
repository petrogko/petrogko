import { escapeXml, svgDoc, THEMES, FONT_SANS, FONT_MONO, TWINKLE_CSS } from './svg.js';
import { weatherKind } from '../sky/weather.js';

export const HERO_WIDTH = 800;
export const HERO_HEIGHT = 260;

const r1 = n => Math.round(n * 10) / 10;

const SKIES = {
  dawn: {
    stops: [[0, '#1c2a5e'], [0.45, '#6b4c9a'], [0.78, '#e88a7d'], [1, '#f7c58b']],
    title: '#ffffff', subtitle: '#fde8e0', line: '#ffffff', star: '#ffffff', label: '#ffffff', stars: 4,
    sun: { cx: 620, cy: 214, r: 26, glow: 120, core: '#fff4d6', halo: '#ffd27a' },
  },
  day: {
    stops: [[0, '#2f6fd6'], [0.6, '#6fb0f0'], [1, '#bfe2fb']],
    title: '#0b1f3a', subtitle: '#173a6a', line: '#ffffff', star: '#ffffff', label: '#173a6a', stars: 0,
    sun: { cx: 420, cy: 50, r: 24, glow: 90, core: '#fffdf2', halo: '#fff1a8' },
  },
  dusk: {
    stops: [[0, '#241a52'], [0.42, '#7a2f7a'], [0.75, '#e0566b'], [1, '#f5a35c']],
    title: '#ffffff', subtitle: '#ffe0ea', line: '#ffd6f0', star: '#ffeaf6', label: '#ffe0ea', stars: 5,
    sun: { cx: 180, cy: 214, r: 28, glow: 130, core: '#ffd9a6', halo: '#ff8a5c' },
  },
  night: {
    radial: true,
    stops: [[0, '#1b2550'], [0.55, '#0b1026'], [1, '#05070f']],
    title: '#ffffff', subtitle: '#cfd9f5', line: '#a8c4ff', star: '#e3ecff', label: '#b3c4ee', stars: 12,
    sun: null,
  },
};

const AURORA = { normal: ['#6e40c9', '#1f6feb', '#2ea4a4'], canadaday: ['#d52b1e', '#ffffff', '#ff6b5e'] };

const BG_STARS = [
  [40, 30, 1.2], [110, 70, 0.9], [210, 20, 1.3], [300, 200, 1], [400, 40, 0.8], [380, 215, 1.1],
  [560, 16, 0.9], [770, 30, 1], [24, 180, 1], [470, 120, 0.8], [150, 140, 0.7], [760, 200, 0.9],
];

const CLOUD_COLORS = {
  light: { dawn: '#f6dbe4', day: '#ffffff', dusk: '#f2c6d6', night: '#8a96b8' },
  dense: { dawn: '#cdb6c8', day: '#dfe6ef', dusk: '#b996ad', night: '#5d6886' },
};
const LIGHT_CLOUDS = [[180, 60, 1], [430, 175, 1.1]];
const DENSE_CLOUDS = [[110, 46, 1.3], [330, 92, 1], [540, 38, 1.4], [700, 150, 1.1]];
const RAIN_BAND = [[60, 14, 1.4], [230, 8, 1.5], [400, 16, 1.3], [570, 6, 1.5], [740, 14, 1.4]];
const RAIN_DROPS = Array.from({ length: 28 }, (_, i) => [r1(15 + i * 28.5), ((i * 53) % 240) + 10]);
const SNOW_FLAKES = Array.from({ length: 24 }, (_, i) => [20 + i * 33, ((i * 71) % 240) + 10, 1.5 + (i % 3) * 0.5]);

const LEAF = 'M0 -10 L2 -4 L7 -6 L5 0 L9 2 L3 4 L4 9 L0 6 L-4 9 L-3 4 L-9 2 L-5 0 L-7 -6 L-2 -4 Z';
const LEAVES = [
  [90, 30, 20, '#e8562a'], [260, 120, -35, '#f28c28'], [410, 60, 50, '#d63a2f'],
  [610, 190, -15, '#f2b134'], [720, 90, 30, '#c8442b'],
];
const FIREWORKS = [[300, 50, 'b0'], [440, 34, 'b1'], [390, 190, 'b2']];

const BASE_CSS = [
  TWINKLE_CSS,
  '@keyframes glow { 0%, 100% { opacity: 0.6; } 50% { opacity: 0.95; } }',
  '.glow { animation: glow 4s ease-in-out infinite; }',
  '@keyframes drift { from { transform: translateX(0); } to { transform: translateX(-800px); } }',
  '.drift { animation: drift 80s linear infinite; }',
  '@keyframes fall { from { transform: translateY(0); } to { transform: translateY(260px); } }',
  '.rain { animation: fall 0.8s linear infinite; }',
  '.snow { animation: fall 9s linear infinite; }',
  '.leaves { animation: fall 14s linear infinite; }',
  '@keyframes sway { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }',
  '.sway { animation: sway 7s ease-in-out infinite; }',
  '@keyframes burst { 0% { transform: scale(0.2); opacity: 0; } 15% { opacity: 1; } 70% { transform: scale(1); opacity: 0.9; } 100% { transform: scale(1.1); opacity: 0; } }',
  '.burst { opacity: 0; transform-box: fill-box; transform-origin: center; animation: burst 2.4s ease-out infinite; }',
  '.b1 { animation-delay: 0.8s; }',
  '.b2 { animation-delay: 1.6s; }',
].join(' ');

function skyGradient(look) {
  const stops = look.stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('');
  return look.radial
    ? `<radialGradient id="sky" cx="0.7" cy="0.1" r="1">${stops}</radialGradient>`
    : `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient>`;
}

function overcastVeil(kind, phase) {
  if (!['dense-clouds', 'rain', 'snow'].includes(kind)) return '';
  return phase === 'night'
    ? `<rect width="${HERO_WIDTH}" height="${HERO_HEIGHT}" fill="#000000" fill-opacity="0.2"/>`
    : `<rect width="${HERO_WIDTH}" height="${HERO_HEIGHT}" fill="#5d6b80" fill-opacity="0.35"/>`;
}

function sunLayer(sun, kind) {
  if (!sun) return '';
  const dim = ['dense-clouds', 'rain', 'snow'].includes(kind) ? ' opacity="0.35"' : '';
  return (
    `<defs><radialGradient id="sun-glow"><stop offset="0" stop-color="${sun.core}"/>` +
    `<stop offset="0.4" stop-color="${sun.halo}" stop-opacity="0.85"/><stop offset="1" stop-color="${sun.halo}" stop-opacity="0"/></radialGradient></defs>` +
    `<g${dim}><circle class="glow" cx="${sun.cx}" cy="${sun.cy}" r="${sun.glow}" fill="url(#sun-glow)"/>` +
    `<circle cx="${sun.cx}" cy="${sun.cy}" r="${sun.r}" fill="${sun.core}"/></g>`
  );
}

function auroraLayer([a, b, c]) {
  return (
    `<defs><linearGradient id="aurora" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0" stop-color="${a}" stop-opacity="0"/>` +
    `<stop class="aurora-a" offset="0.35" stop-color="${a}" stop-opacity="0.55"/>` +
    `<stop class="aurora-b" offset="0.7" stop-color="${c}" stop-opacity="0.45"/>` +
    `<stop offset="1" stop-color="${b}" stop-opacity="0"/></linearGradient>` +
    `<filter id="aurora-blur" x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation="14"/></filter></defs>` +
    `<path class="sway" d="M-40 100 C 160 30, 360 160, 560 70 S 840 60, 860 90 L860 140 C 660 120, 520 210, 320 150 S 40 130, -40 165 Z" fill="url(#aurora)" filter="url(#aurora-blur)"/>`
  );
}

function auroraCss([a, b, c]) {
  return (
    '.aurora-a { animation: aurora-a 9s ease-in-out infinite; } .aurora-b { animation: aurora-b 9s ease-in-out infinite; } ' +
    `@keyframes aurora-a { 0%, 100% { stop-color: ${a}; } 33% { stop-color: ${b}; } 66% { stop-color: ${c}; } } ` +
    `@keyframes aurora-b { 0%, 100% { stop-color: ${c}; } 33% { stop-color: ${a}; } 66% { stop-color: ${b}; } }`
  );
}

function backgroundStars(count) {
  return BG_STARS.slice(0, count)
    .map(([x, y, r], i) => `<circle class="tw${i % 3}" cx="${x}" cy="${y}" r="${r}" fill="#ffffff"/>`)
    .join('');
}

/** Lit part of the moon: outer limb arc plus an elliptical terminator. Waxing lights the right side. */
export function moonPath(cx, cy, r, { illumination, waxing }) {
  const rx = r1(r * Math.abs(1 - 2 * illumination));
  const outerSweep = waxing ? 1 : 0;
  const terminatorSweep = waxing ? (illumination < 0.5 ? 0 : 1) : illumination < 0.5 ? 1 : 0;
  return `M${cx} ${cy - r} A${r} ${r} 0 0 ${outerSweep} ${cx} ${cy + r} A${rx} ${r} 0 0 ${terminatorSweep} ${cx} ${cy - r}Z`;
}

function moonLayer(moon, holiday, phase) {
  const halloween = holiday === 'halloween';
  if (!halloween && (phase !== 'night' || !moon.visible)) return '';
  const lit = halloween ? { illumination: 1, waxing: true } : moon;
  const color = halloween ? '#ff9a3c' : '#f3f0e0';
  const opacity = phase === 'night' ? 1 : 0.5;
  const cx = phase === 'day' ? 300 : 380; // keep clear of the midday sun at (420, 50)
  return (
    `<g opacity="${opacity}"><circle cx="${cx}" cy="46" r="16" fill="#2a3150" fill-opacity="0.5"/>` +
    `<path d="${moonPath(cx, 46, 16, lit)}" fill="${color}"/></g>`
  );
}

const cloudShape = (x, y, s) =>
  `<ellipse cx="${x}" cy="${y}" rx="${r1(46 * s)}" ry="${r1(14 * s)}"/>` +
  `<ellipse cx="${r1(x + 28 * s)}" cy="${r1(y - 10 * s)}" rx="${r1(30 * s)}" ry="${r1(14 * s)}"/>` +
  `<ellipse cx="${r1(x - 26 * s)}" cy="${r1(y - 4 * s)}" rx="${r1(22 * s)}" ry="${r1(10 * s)}"/>`;

function driftingClouds(list, color, opacity) {
  const shapes = list.map(([x, y, s]) => cloudShape(x, y, s)).join('');
  return `<g class="drift" fill="${color}" fill-opacity="${opacity}"><g>${shapes}</g><g transform="translate(800 0)">${shapes}</g></g>`;
}

/** Two stacked copies so a translateY(0 → 260px) loop is seamless. */
function fallingLoop(cls, inner) {
  return `<g class="${cls}"><g>${inner}</g><g transform="translate(0 -260)">${inner}</g></g>`;
}

function weatherLayer(kind, phase) {
  const night = phase === 'night';
  switch (kind) {
    case 'light-clouds':
      return driftingClouds(LIGHT_CLOUDS, CLOUD_COLORS.light[phase], night ? 0.35 : 0.8);
    case 'dense-clouds':
      return driftingClouds(DENSE_CLOUDS, CLOUD_COLORS.dense[phase], night ? 0.5 : 0.9);
    case 'rain': {
      const drops = RAIN_DROPS.map(([x, y]) => `<line x1="${x}" y1="${y}" x2="${r1(x - 4)}" y2="${y + 12}"/>`).join('');
      const band = RAIN_BAND.map(([x, y, s]) => cloudShape(x, y, s)).join('');
      return (
        `<g stroke="#cfe0ff" stroke-opacity="0.7" stroke-width="1.4">${fallingLoop('rain', drops)}</g>` +
        `<g fill="${CLOUD_COLORS.dense[phase]}" fill-opacity="${night ? 0.6 : 0.9}">${band}</g>`
      );
    }
    case 'snow': {
      const flakes = SNOW_FLAKES.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');
      return `<g fill="#ffffff" fill-opacity="0.9">${fallingLoop('snow', flakes)}</g>`;
    }
    default:
      return '';
  }
}

function fireworks() {
  const colors = AURORA.normal;
  return FIREWORKS.map(([cx, cy, cls], i) => {
    const rays = Array.from({ length: 12 }, (_, k) => {
      const a = (k / 12) * Math.PI * 2;
      return `<line x1="${cx}" y1="${cy}" x2="${r1(cx + Math.cos(a) * 30)}" y2="${r1(cy + Math.sin(a) * 30)}"/>`;
    }).join('');
    return `<g class="burst ${cls}" stroke="${colors[i]}" stroke-width="2" stroke-linecap="round">${rays}</g>`;
  }).join('');
}

function seasonalLayer({ season, holiday }, kind) {
  if (holiday === 'newyear') return fireworks();
  if (holiday) return '';
  if (season !== 'autumn' || kind === 'rain' || kind === 'snow') return '';
  const leaves = LEAVES.map(
    ([x, y, a, c]) => `<path d="${LEAF}" fill="${c}" transform="translate(${x} ${y}) rotate(${a})"/>`
  ).join('');
  return fallingLoop('leaves', leaves);
}

function constellationLayer({ stars, edges }, look, phase) {
  const bySlot = new Map(stars.map(s => [s.slot, s]));
  const day = phase === 'day';
  const lines = edges
    .map(([a, b]) => {
      const p = bySlot.get(a);
      const q = bySlot.get(b);
      return `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}"/>`;
    })
    .join('');
  const dots = stars
    .map((s, i) => {
      const cls = day ? '' : ` class="tw${i % 3}"`;
      return s.kind === 'tool'
        ? `<circle${cls} cx="${s.x}" cy="${s.y}" r="${s.r}" fill="none" stroke="${look.star}" stroke-width="1.2"/>`
        : `<circle${cls} cx="${s.x}" cy="${s.y}" r="${s.r}" fill="${look.star}"/>`;
    })
    .join('');
  const labels = stars
    .map(s => {
      const right = s.x > 700;
      const x = right ? r1(s.x - s.r - 6) : r1(s.x + s.r + 6);
      return `<text x="${x}" y="${s.y + 4}"${right ? ' text-anchor="end"' : ''}>${escapeXml(s.label)}</text>`;
    })
    .join('');
  return (
    `<g stroke="${look.line}" stroke-opacity="0.5" stroke-width="1.1"${day ? ' stroke-dasharray="3 4"' : ''}>${lines}</g>` +
    `<g>${dots}</g>` +
    `<g font-family="${FONT_MONO}" font-size="11" fill="${look.label}" fill-opacity="0.85">${labels}</g>`
  );
}

/**
 * Each line is visible for its slot, then fades out; it fades back in at the end of the cycle.
 * Negative delays phase-shift line i by i slots, and line 0 is visible by default, so a static
 * render (no animation) still shows the first tagline.
 */
function taglineCss(count, seconds = 3) {
  if (count < 2) return '';
  const slot = 100 / count;
  const fade = slot * 0.12;
  const pct = n => Number(n.toFixed(2));
  const lines = Array.from(
    { length: count },
    (_, i) => `.tl${i} { opacity: ${i === 0 ? 1 : 0}; animation-delay: ${-((count - i) % count) * seconds}s; }`
  ).join(' ');
  return (
    `.tl { animation: cycle ${count * seconds}s linear infinite; } ${lines} ` +
    `@keyframes cycle { 0% { opacity: 1; } ${pct(slot - fade)}% { opacity: 1; } ${pct(slot)}% { opacity: 0; } ${pct(100 - fade)}% { opacity: 0; } 100% { opacity: 1; } }`
  );
}

function headingLayer(greeting, taglines, location, look, holiday) {
  const rotating = taglines.length > 1;
  const title = `<text x="48" y="104" font-family="${FONT_SANS}" font-weight="700" font-size="40" fill="${look.title}">${escapeXml(greeting)}</text>`;
  const lines = taglines
    .map(
      (t, i) =>
        `<text${rotating ? ` class="tl tl${i}"` : ''} x="50" y="136" font-family="${FONT_SANS}" font-size="17" fill="${look.subtitle}">${escapeXml(`${t} · ${location}`)}</text>`
    )
    .join('');
  const leafX = 48 + [...greeting].length * 19 + 16; // ~19px per glyph at 40px bold sans
  const leaf =
    holiday === 'canadaday' ? `<path d="${LEAF}" fill="#d52b1e" transform="translate(${leafX} 90) scale(1.2)"/>` : '';
  return title + lines + leaf;
}

export function renderHero({ theme, sky, weatherId = null, constellation, greeting, taglines, location }) {
  const look = SKIES[sky.phase];
  const kind = weatherKind(weatherId);
  const night = sky.phase === 'night';
  const auroraColors = sky.holiday === 'canadaday' ? AURORA.canadaday : AURORA.normal;
  const style = [BASE_CSS, night ? auroraCss(auroraColors) : '', taglineCss(taglines.length)]
    .filter(Boolean)
    .join(' ');
  const body = [
    `<defs>${skyGradient(look)}</defs>`,
    `<rect width="${HERO_WIDTH}" height="${HERO_HEIGHT}" fill="url(#sky)"/>`,
    sunLayer(look.sun, kind),
    night ? auroraLayer(auroraColors) : '',
    backgroundStars(look.stars),
    moonLayer(sky.moon, sky.holiday, sky.phase),
    overcastVeil(kind, sky.phase),
    weatherLayer(kind, sky.phase),
    seasonalLayer(sky, kind),
    constellationLayer(constellation, look, sky.phase),
    headingLayer(greeting, taglines, location, look, sky.holiday),
    `<path d="M0 226 C 180 206, 340 252, 520 228 S 720 216, 800 230 L800 260 L0 260 Z" fill="${THEMES[theme].page}"/>`,
  ].join('');
  return svgDoc({ width: HERO_WIDTH, height: HERO_HEIGHT, title: `${greeting} ${taglines[0]} in ${location}.`, style, body });
}
