/** Fixed star positions in the hero's right half (x 470–760, y 36–210). Slots 0–5 languages, 6–9 tools. */
export const SLOTS = [
  { x: 500, y: 62 },
  { x: 585, y: 96 },
  { x: 680, y: 70 },
  { x: 740, y: 130 },
  { x: 650, y: 172 },
  { x: 556, y: 150 },
  { x: 488, y: 198 },
  { x: 622, y: 40 },
  { x: 742, y: 200 },
  { x: 756, y: 44 },
];

export const EDGES = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 1],
  [5, 6],
  [1, 7],
  [4, 8],
  [2, 9],
];

const MAX_LANGUAGES = 6;
const MAX_TOOLS = 4;
const round1 = n => Math.round(n * 10) / 10;

export function layoutConstellation(languages, toolStars) {
  const total = languages.reduce((sum, l) => sum + l.bytes, 0);
  const ranked = [...languages]
    .sort((a, b) => b.bytes - a.bytes || a.name.localeCompare(b.name))
    .slice(0, MAX_LANGUAGES);
  const stars = ranked.map((lang, i) => ({
    slot: i,
    ...SLOTS[i],
    r: round1(2.5 + 5 * Math.sqrt(total ? lang.bytes / total : 0)),
    label: lang.name.toLowerCase(),
    kind: 'language',
  }));
  toolStars.slice(0, MAX_TOOLS).forEach((label, i) => {
    const slot = MAX_LANGUAGES + i;
    stars.push({ slot, ...SLOTS[slot], r: 2.2, label, kind: 'tool' });
  });
  const used = new Set(stars.map(s => s.slot));
  const edges = EDGES.filter(([a, b]) => used.has(a) && used.has(b));
  return { stars, edges };
}
