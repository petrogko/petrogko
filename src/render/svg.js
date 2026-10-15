export const FONT_SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
export const FONT_MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

export const THEMES = {
  dark: {
    page: '#0d1117',
    cardFrom: '#1a1740',
    cardTo: '#0e1a2e',
    border: '#2a3560',
    text: '#f0f4ff',
    muted: '#8b9bd0',
    pillBg: '#11172e',
    pillBorder: '#263156',
    pillText: '#cfe0ff',
  },
  light: {
    page: '#ffffff',
    cardFrom: '#ffffff',
    cardTo: '#f6f8ff',
    border: '#d0d7f0',
    text: '#1b2550',
    muted: '#5b6a99',
    pillBg: '#f6f8ff',
    pillBorder: '#d0d7f0',
    pillText: '#1b2550',
  },
};

export const REDUCED_MOTION =
  '@media (prefers-reduced-motion: reduce) { * { animation: none !important; } .tl0 { opacity: 1 !important; } }';

export const TWINKLE_CSS = [
  '@keyframes twinkle { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }',
  '.tw0 { animation: twinkle 2.4s ease-in-out infinite; }',
  '.tw1 { animation: twinkle 3.1s ease-in-out 0.8s infinite; }',
  '.tw2 { animation: twinkle 1.9s ease-in-out 1.4s infinite; }',
].join(' ');

export function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Greedy word wrap; hard-breaks long tokens; ellipsis on the last kept line when truncated. */
export function wrapText(text, maxChars, maxLines) {
  const words = String(text ?? '')
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
  const pieces = words.flatMap(w =>
    [...w].length <= maxChars ? [w] : w.match(new RegExp(`.{1,${maxChars}}`, 'gu'))
  );
  const lines = [];
  let current = '';
  for (const piece of pieces) {
    if (!current) current = piece;
    else if ([...`${current} ${piece}`].length <= maxChars) current += ` ${piece}`;
    else {
      lines.push(current);
      current = piece;
    }
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;

  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  if ([...last].length >= maxChars) {
    const cut = [...last].slice(0, maxChars - 1).join('');
    last = cut.includes(' ') ? cut.slice(0, cut.lastIndexOf(' ')) : cut;
  }
  kept[maxLines - 1] = `${last.replace(/[\s.,;:]+$/u, '')}…`;
  return kept;
}

/** FNV-1a 32-bit. */
export function hashString(str) {
  let h = 0x811c9dc5;
  for (const ch of String(str)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32 PRNG. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hslToHex(h, s, l) {
  const sat = s / 100;
  const light = l / 100;
  const k = n => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = n => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = x => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`;
}

export function svgDoc({ width, height, title, style = '', body }) {
  const css = style ? `${style} ${REDUCED_MOTION}` : REDUCED_MOTION;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(title)}">` +
    `<title>${escapeXml(title)}</title><style>${css}</style>${body}</svg>\n`
  );
}
