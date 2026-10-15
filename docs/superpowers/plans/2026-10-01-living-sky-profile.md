# Living Sky Profile README Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken Puppeteer/Mustache profile generator with an hourly, fail-soft pipeline. It renders a living Toronto sky hero plus themed cards as SVGs, publishes them to an `output` branch, and commits `README.md` to `main` only when its text changes.

**Architecture:**
- **Pure date→state modules (`src/sky/*`)** compute sun and moon state and the season.
- **Pure state→SVG renderers (`src/render/*`)** turn that state into SVG strings.
- **Network-only sources (`src/sources/*`)** take an injectable `fetch`.
- **`src/index.js`** is the single place where source failures become fallbacks (from `last-good.json`). It validates every SVG before writing.
- **A GitHub Actions workflow** runs it hourly, force-pushes `dist/` to `output`, and commits README changes.

**Tech Stack:** Node 24 LTS (ESM, `node:test`, built-in `fetch`), `mustache@4.2.0`, `suncalc@2.1.0`, GitHub Actions, `Platane/snk/svg-only`.

**Spec:** `docs/superpowers/specs/2026-10-01-living-sky-profile-design.md`

## Global Constraints

**Runtime and code style**
- Node 24 LTS, `"type": "module"`. The only runtime dependencies are `mustache` and `suncalc`, with no dev dependencies; tests use `node:test`.
- Location: Toronto, lat `43.6532`, lon `-79.3832`, timezone `America/Toronto`. All displayed dates and times, holidays and activity dates use Toronto local time.
- Code style follows `.prettierrc.yaml`: single quotes, semicolons, 2-space indent, `printWidth: 110`, `arrowParens: avoid`, ES5 trailing commas.

**Data sources**
- Public non-fork repos only. No private repo names may appear anywhere in output.
- Every untrusted string (repo names, descriptions, event payloads, API text) goes through `escapeXml` in SVG. In the README it goes through the custom Mustache `escape`, which escapes `& < > "` but **not** `/`.
- The OpenWeather API key must never appear in logs or error messages (`appid=***`).

**SVG output**
- Every image comes in `-dark` and `-light` variants. A hero's two variants differ only in the wave fill: `#0d1117` (dark) or `#ffffff` (light).
- SVG animation is CSS `@keyframes` only. No SMIL (`<animate…>`), no external fonts or images, no `href`.
- Every SVG includes `@media (prefers-reduced-motion: reduce) { * { animation: none !important; } .tl0 { opacity: 1 !important; } }`.
- Aurora palette: violet `#6e40c9`, blue `#1f6feb`, teal `#2ea4a4`. Night sky `#1b2550 → #0b1026 → #05070f`.

**README invariant**
- `README.md` must contain **no value that changes between runs**: no timestamps, static alt text, absolute activity dates (`MMM d`).

**Workflow**
- Cadence: cron `17 * * * *`.
- Every workflow `uses:` is pinned to a full commit SHA with the version in a comment:
  - `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1` (v7.0.1)
  - `actions/setup-node@820762786026740c76f36085b0efc47a31fe5020` (v7.0.0)
  - `actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` (v7.0.1)
  - `Platane/snk/svg-only@d8f6715049803e982ee5ff501b6b9b7d5deeb09b` (v3.5.0)

**Failure handling**
- Weather fallback is used only if it is at most 6h old. GitHub fallback may be any age.
- If GitHub data is unavailable and there is no fallback, the run fails (exit 1) and publishes nothing.

**Local machine**
- Git has no global identity on this machine. Commit with `git -c user.name='Petro G' -c user.email='petro.gko@gmail.com' commit …`. End every message with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Shell quirks: `head`, `ls` and `rm` are wrapped by shell functions or aliases. Use `command head`, `/bin/ls` and `/bin/rm -f`.

## Review Focus

1. **The 2021 OpenWeather key is now invalid (HTTP 401).** The run must stay green, the weather card must say "weather unavailable", the sky must still render, and the key must never appear in the warning text. *(Task 10 test `invalid weather key…`; Task 7 test `redacts appid…`)*
2. **Two hourly runs with identical GitHub data must produce a byte-identical `README.md`.** Otherwise `main` gets a bot commit every hour. *(Task 10 test `README is identical…`)*
3. **A repo description containing `<`, `&`, quotes or a 60-character unbroken token** must be escaped and hard-wrapped in the featured card, and escaped in README alt text. *(Task 6 test `featured card escapes…`; Task 9 test `escapes descriptions…`)*
4. **First run ever (no `output` branch, so no `.cache/last-good.json`), or a truncated or corrupt file:** treat it as empty and carry on. *(Task 8 tests; Task 10 test `corrupt last-good…`)*
5. **Runs near midnight UTC and on DST-change days.** Holidays, activity dates and sun times must use Toronto's calendar day, not UTC's. *(Task 1 `formatShortDate…`, Task 3 `DST`, Task 7 `release date…`)*

---

## File Structure

| Path | Responsibility |
|---|---|
| `package.json` | ESM, Node ≥ 24, scripts `build` / `test` / `preview`, deps `mustache`, `suncalc` |
| `src/config.js` | All personal and static settings (user, location, taglines, skills, tool stars, links, output URL) |
| `src/time.js` | Toronto-aware date helpers: `zonedParts`, `utcOffsetMinutes`, `formatClock`, `formatShortDate`, `formatStamp` |
| `src/sky/phase.js` | `sunTimes(now, location)`, `phaseAt(now, sun)` |
| `src/sky/moon.js` | `moonAt(now)` |
| `src/sky/season.js` | `seasonAt(now, timeZone)` |
| `src/sky/weather.js` | `weatherKind(conditionId)`: OpenWeather id → visual layer |
| `src/sky/index.js` | `skyState(now, location)` combining the above |
| `src/render/svg.js` | Shared SVG primitives: escaping, wrapping, hashing, colours, themes, `svgDoc`, `TWINKLE_CSS` |
| `src/render/xml.js` | `findXmlError(xml)`, a well-formedness checker |
| `src/render/constellation.js` | `layoutConstellation(languages, toolStars)` → `{ stars, edges }` |
| `src/render/hero.js` | `renderHero(…)`, `moonPath(…)` |
| `src/render/cards.js` | `renderWeatherCard`, `renderStatsCard`, `renderFeaturedCard`, `renderSkills`, `renderButton` |
| `src/sources/http.js` | `fetchJson` (timeout, one retry, key redaction), `HttpError` |
| `src/sources/weather.js` | `fetchWeather`, `MissingKeyError` |
| `src/sources/github.js` | `fetchGithub`, `sumLanguages`, `pickFeatured`, `humanize`, `describeEvent`, `mapEvents` |
| `src/lastGood.js` | `readLastGood`, `freshWeather`, `anyGithub`, `writeLastGood` |
| `src/readme.js` | `renderReadme(…)` from `templates/README.mustache` |
| `src/index.js` | `run(…)`, `renderFiles(…)`, plus the CLI entry |
| `templates/README.mustache` | Page layout and static copy |
| `scripts/sample-data.js` | `SAMPLE`, shared fixture data for previews and snapshot tests |
| `scripts/preview.js` | `previewEntries()`, which writes `preview/*.svg` and `preview/index.html` |
| `test/helpers/snapshot.js` | `matchSnapshot(name, actual)` |
| `test/helpers/fakeFetch.js` | `fakeFetch(routes)`, `reply(status, body)` |
| `test/fixtures/github.js` | `githubRoutes()`, `EVENTS` |
| `test/*.test.js` | One test file per module |
| `.github/workflows/build.yaml` | Hourly build and publish (replaces `main.yaml`) |

Deleted:
- `index.js`
- `services/puppeteer.service.js`
- `main.mustache`
- `README.md.bak`
- `images/code.gif`
- `images/dev-working.gif`
- `.github/workflows/main.yaml`

---

### Task 1: Scaffold, cleanup, config and time helpers

**Files:**
- Delete: `index.js`, `services/puppeteer.service.js`, `main.mustache`, `README.md.bak`, `images/code.gif`, `images/dev-working.gif`, `package-lock.json`
- Create: `package.json` (replace), `src/config.js`, `src/time.js`, `test/time.test.js`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `config` (object, shape below)
  - `zonedParts(date: Date, timeZone: string) → { year, month, day, hour, minute, weekday }`, where `month` is 1–12, `hour` is 0–23 and `weekday` is like `'Thu'`
  - `utcOffsetMinutes(date, timeZone) → number`, minutes east of UTC (EDT gives −240)
  - `formatClock(date, timeZone) → 'HH:mm'`
  - `formatShortDate(date, timeZone) → 'Oct 1'`
  - `formatStamp(date, timeZone) → 'Thu 1 Oct, 15:17 EDT'`

- [ ] **Step 1: Remove the legacy generator**

```bash
cd /Users/petrog/Development/github/petrogko
git rm -q index.js services/puppeteer.service.js main.mustache README.md.bak images/code.gif images/dev-working.gif package-lock.json
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "petrogko",
  "version": "2.0.0",
  "private": true,
  "description": "Self-updating GitHub profile README with a living Toronto sky.",
  "type": "module",
  "license": "MIT",
  "author": "Petro G",
  "engines": {
    "node": ">=24"
  },
  "scripts": {
    "build": "node src/index.js --out dist",
    "test": "node --test \"test/**/*.test.js\"",
    "preview": "node scripts/preview.js"
  },
  "dependencies": {
    "mustache": "^4.2.0",
    "suncalc": "^2.1.0"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/petrogko/petrogko.git"
  }
}
```

- [ ] **Step 3: Replace `.gitignore`**

```gitignore
/node_modules
**/.DS_Store
.env
.superpowers/
/dist/
/preview/
/.cache/
```

- [ ] **Step 4: Install dependencies (creates `package-lock.json`)**

Run: `npm install`
Expected: `added 2 packages`, and a new `package-lock.json`.

- [ ] **Step 5: Write `src/config.js`**

```js
export const config = {
  user: 'petrogko',
  greeting: "Hi, I'm Petro 👋",
  location: { city: 'Toronto', lat: 43.6532, lon: -79.3832, timeZone: 'America/Toronto' },
  taglines: ['Solutions & DevOps Engineer', 'Homelab tinkerer', 'AI app builder', 'Star-chart maker'],
  skills: [
    { icon: '🐍', label: 'Python' },
    { icon: '🟦', label: 'TypeScript' },
    { icon: '🐹', label: 'Go' },
    { icon: '🐳', label: 'Docker' },
    { icon: '☸️', label: 'Kubernetes' },
    { icon: '☁️', label: 'AWS' },
    { icon: '🐧', label: 'Linux' },
    { icon: '🤖', label: 'LLMs' },
  ],
  toolStars: ['docker', 'kubernetes', 'aws', 'llms'],
  excludeRepos: [],
  featuredTopic: 'featured',
  maxFeatured: 4,
  activityLimit: 5,
  outputBase: 'https://raw.githubusercontent.com/petrogko/petrogko/output',
  links: {
    site: 'https://petrogko.com',
    linkedin: 'https://www.linkedin.com/in/petrog/',
    coffee: 'https://www.buymeacoffee.com/petrogko',
  },
  buttons: [
    { file: 'btn-site', icon: '🌐', label: 'petrogko.com' },
    { file: 'btn-linkedin', icon: '💼', label: 'LinkedIn' },
    { file: 'btn-coffee', icon: '☕', label: 'Buy me a coffee' },
  ],
};
```

- [ ] **Step 6: Write the failing test `test/time.test.js`**

```js
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
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL with `Cannot find module '…/src/time.js'`

- [ ] **Step 8: Write `src/time.js`**

```js
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
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 5 tests.

- [ ] **Step 10: Commit**

```bash
git add -A package.json package-lock.json .gitignore src/config.js src/time.js test/time.test.js
git -c user.name='Petro G' -c user.email='petro.gko@gmail.com' commit -m "chore: replace Puppeteer generator with Node 24 scaffold" -m "Removes the Instagram scraper, open proxy flags, legacy template and unused GIFs. Adds config and Toronto-aware time helpers." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: SVG primitives, XML checker and snapshot helper

**Files:**
- Create: `src/render/svg.js`, `src/render/xml.js`, `test/helpers/snapshot.js`, `test/svg.test.js`, `test/xml.test.js`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `escapeXml(value) → string`
  - `wrapText(text, maxChars, maxLines) → string[]`
  - `hashString(str) → uint32`
  - `seededRandom(seed) → () => number`, returning values in [0, 1)
  - `hslToHex(h, s, l) → '#rrggbb'`
  - `svgDoc({ width, height, title, style?, body }) → string`
  - Constants: `THEMES.dark` / `THEMES.light` (keys `page, cardFrom, cardTo, border, text, muted, pillBg, pillBorder, pillText`), `FONT_SANS`, `FONT_MONO`, `REDUCED_MOTION`, `TWINKLE_CSS`
  - `findXmlError(xml) → string | null`
  - `matchSnapshot(name, actual)` (test helper)

- [ ] **Step 1: Write the failing test `test/svg.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeXml,
  wrapText,
  hashString,
  seededRandom,
  hslToHex,
  svgDoc,
  REDUCED_MOTION,
} from '../src/render/svg.js';

test('escapeXml escapes all five XML specials', () => {
  assert.equal(
    escapeXml(`<a href="x">Tom & 'Jerry'</a>`),
    '&lt;a href=&quot;x&quot;&gt;Tom &amp; &apos;Jerry&apos;&lt;/a&gt;'
  );
  assert.equal(escapeXml(42), '42');
});

test('wrapText wraps on word boundaries', () => {
  assert.deepEqual(wrapText('one two three four', 9, 3), ['one two', 'three', 'four']);
});

test('wrapText truncates with an ellipsis at a word boundary', () => {
  assert.deepEqual(wrapText('aaa bbb ccc ddd eee', 7, 2), ['aaa bbb', 'ccc…']);
});

test('wrapText hard-breaks unbroken tokens, emoji-safe', () => {
  assert.deepEqual(wrapText('abcdefghij', 4, 3), ['abcd', 'efgh', 'ij']);
  assert.deepEqual(wrapText('🚀🚀🚀🚀🚀', 2, 3), ['🚀🚀', '🚀🚀', '🚀']);
  assert.deepEqual(wrapText('   ', 10, 3), []);
});

test('hashString is deterministic and input-sensitive', () => {
  assert.equal(hashString('religion-history-timeline'), hashString('religion-history-timeline'));
  assert.notEqual(hashString('abc'), hashString('abd'));
});

test('seededRandom repeats for the same seed and stays in [0, 1)', () => {
  const a = seededRandom(7);
  const b = seededRandom(7);
  const xs = Array.from({ length: 20 }, () => a());
  assert.deepEqual(
    xs,
    Array.from({ length: 20 }, () => b())
  );
  assert.ok(xs.every(x => x >= 0 && x < 1));
});

test('hslToHex converts primaries', () => {
  assert.equal(hslToHex(0, 100, 50), '#ff0000');
  assert.equal(hslToHex(120, 100, 50), '#00ff00');
  assert.equal(hslToHex(240, 100, 50), '#0000ff');
});

test('svgDoc embeds title, style and the reduced-motion rule', () => {
  const svg = svgDoc({ width: 10, height: 20, title: 'A & B', style: '.x { fill: red; }', body: '<g/>' });
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="10" height="20" viewBox="0 0 10 20"/);
  assert.ok(svg.includes('<title>A &amp; B</title>'));
  assert.ok(svg.includes('.x { fill: red; }'));
  assert.ok(svg.includes(REDUCED_MOTION));
  assert.ok(svg.endsWith('</svg>\n'));
});
```

- [ ] **Step 2: Write the failing test `test/xml.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findXmlError } from '../src/render/xml.js';

test('accepts well-formed SVG', () => {
  assert.equal(findXmlError('<svg><g a="1"/><text>x &amp; y</text></svg>'), null);
  assert.equal(findXmlError('<?xml version="1.0"?><!-- <oops> --><svg/>'), null);
  assert.equal(findXmlError('<svg><style>.a { b: c; } * { d: e !important; }</style></svg>'), null);
});

test('rejects structural problems', () => {
  assert.match(findXmlError('<svg><g></svg>'), /expected <\/g>/);
  assert.match(findXmlError('<svg><g>'), /unclosed <g>/);
  assert.match(findXmlError('<a/><b/>'), /more than one root/);
  assert.match(findXmlError('plain text'), /no root element/);
  assert.match(findXmlError('<svg a="1" a="2"/>'), /duplicate attribute/);
  assert.match(findXmlError('<svg a=1/>'), /malformed attributes/);
});

test('rejects bare ampersands in text and attributes', () => {
  assert.match(findXmlError('<svg>a & b</svg>'), /bare "&" in text/);
  assert.match(findXmlError('<svg a="x&y"/>'), /bare "&" in attributes/);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL with `Cannot find module '…/src/render/svg.js'` and `…/src/render/xml.js`

- [ ] **Step 4: Write `src/render/svg.js`**

```js
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
```

- [ ] **Step 5: Write `src/render/xml.js`**

```js
const NAME = /^[A-Za-z_][\w.:-]*$/;
const ATTRS = /^(?:\s+[A-Za-z_][\w.:-]*\s*=\s*(?:"[^"<]*"|'[^'<]*'))*\s*$/;
const BAD_AMP = /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/;

/** Returns null when `xml` is well-formed, otherwise a short description of the first problem found. */
export function findXmlError(xml) {
  const src = xml.replace(/<!--[\s\S]*?-->/g, '');
  const stack = [];
  let roots = 0;
  let i = 0;
  while (i < src.length) {
    const lt = src.indexOf('<', i);
    const text = src.slice(i, lt === -1 ? src.length : lt);
    if (BAD_AMP.test(text)) return `bare "&" in text near "${text.trim().slice(0, 40)}"`;
    if (lt === -1) break;
    const gt = src.indexOf('>', lt);
    if (gt === -1) return 'unterminated tag';
    const raw = src.slice(lt + 1, gt);
    i = gt + 1;
    if (raw.startsWith('?') || raw.startsWith('!')) continue;
    if (raw.startsWith('/')) {
      const name = raw.slice(1).trim();
      const open = stack.pop();
      if (open !== name) return `expected </${open ?? '(none)'}> but found </${name}>`;
      continue;
    }
    const selfClosing = raw.endsWith('/');
    const body = selfClosing ? raw.slice(0, -1) : raw;
    const name = body.match(/^\S+/)?.[0] ?? '';
    if (!NAME.test(name)) return `invalid tag name "${name}"`;
    const attrs = body.slice(name.length);
    if (!ATTRS.test(attrs)) return `malformed attributes on <${name}>`;
    if (BAD_AMP.test(attrs)) return `bare "&" in attributes of <${name}>`;
    const names = [...attrs.replace(/"[^"]*"|'[^']*'/g, '""').matchAll(/([A-Za-z_][\w.:-]*)\s*=/g)].map(m => m[1]);
    if (new Set(names).size !== names.length) return `duplicate attribute on <${name}>`;
    if (stack.length === 0) {
      roots += 1;
      if (roots > 1) return 'more than one root element';
    }
    if (!selfClosing) stack.push(name);
  }
  if (stack.length) return `unclosed <${stack.at(-1)}>`;
  return roots === 1 ? null : 'no root element';
}
```

- [ ] **Step 6: Write `test/helpers/snapshot.js`**

```js
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';

const DIR = new URL('../__snapshots__/', import.meta.url);

/** Compares `actual` to test/__snapshots__/<name>. UPDATE_SNAPSHOTS=1 rewrites; missing files are created locally but fail in CI. */
export function matchSnapshot(name, actual) {
  const file = new URL(name, DIR);
  const exists = existsSync(file);
  if (!exists && process.env.CI) assert.fail(`missing snapshot ${name}; run UPDATE_SNAPSHOTS=1 npm test locally`);
  if (!exists || process.env.UPDATE_SNAPSHOTS === '1') {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(file, actual);
    return;
  }
  assert.equal(actual, readFileSync(file, 'utf8'), `snapshot ${name} changed; run UPDATE_SNAPSHOTS=1 npm test if intended`);
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS (time, svg and xml suites).

- [ ] **Step 8: Commit**

```bash
git add src/render/svg.js src/render/xml.js test/helpers/snapshot.js test/svg.test.js test/xml.test.js
git -c user.name='Petro G' -c user.email='petro.gko@gmail.com' commit -m "feat: add SVG primitives and XML well-formedness checker" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Sky state (phase, moon, season, weather kind)

**Files:**
- Create: `src/sky/phase.js`, `src/sky/moon.js`, `src/sky/season.js`, `src/sky/weather.js`, `src/sky/index.js`, `test/sky.test.js`

**Interfaces:**
- Consumes:
  - `utcOffsetMinutes(date, tz)`, `zonedParts(date, tz)` from `src/time.js`
  - `getTimes`, `getMoonIllumination` from `suncalc` (ESM named exports)
- Produces:
  - `sunTimes(now: Date, { lat, lon, timeZone }) → { sunrise: Date, sunset: Date }` for the Toronto calendar day containing `now`
  - `phaseAt(now, { sunrise, sunset }) → 'dawn' | 'day' | 'dusk' | 'night'`
  - `moonAt(now) → { phase: number, illumination: number, waxing: boolean, visible: boolean }`
  - `seasonAt(now, timeZone) → { season: 'winter' | 'spring' | 'summer' | 'autumn', holiday: 'halloween' | 'newyear' | 'canadaday' | null }`
  - `weatherKind(conditionId: number | null) → 'none' | 'clear' | 'light-clouds' | 'dense-clouds' | 'rain' | 'snow'`
  - `skyState(now, location) → { phase, sunrise, sunset, moon, season, holiday }`

- [ ] **Step 1: Write the failing test `test/sky.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sunTimes, phaseAt } from '../src/sky/phase.js';
import { moonAt } from '../src/sky/moon.js';
import { seasonAt } from '../src/sky/season.js';
import { weatherKind } from '../src/sky/weather.js';
import { skyState } from '../src/sky/index.js';
import { formatClock, formatShortDate } from '../src/time.js';
import { config } from '../src/config.js';

const LOC = config.location;
const TZ = LOC.timeZone;
const MIN = 60_000;

test('sunTimes matches the real Toronto sunrise and sunset', () => {
  const { sunrise, sunset } = sunTimes(new Date('2026-10-01T19:40:00Z'), LOC);
  assert.equal(formatClock(sunrise, TZ), '07:15');
  assert.equal(formatClock(sunset, TZ), '18:58');
});

test('sunTimes picks the Toronto calendar day on DST-change days', () => {
  for (const iso of ['2026-03-08T06:30:00Z', '2026-03-08T17:00:00Z', '2026-11-01T05:30:00Z', '2026-11-01T17:00:00Z']) {
    const now = new Date(iso);
    const { sunrise, sunset } = sunTimes(now, LOC);
    assert.equal(formatShortDate(sunrise, TZ), formatShortDate(now, TZ), iso);
    const hours = (sunset - sunrise) / 3_600_000;
    assert.ok(hours > 10 && hours < 12, `${iso}: ${hours}h`);
  }
});

test('phaseAt boundaries are [rise-60, rise+60) dawn, [rise+60, set-60) day, [set-60, set+60) dusk', () => {
  const sun = { sunrise: new Date('2026-10-01T11:15:00Z'), sunset: new Date('2026-10-01T22:58:00Z') };
  const at = (base, minutes) => phaseAt(new Date(base.getTime() + minutes * MIN), sun);
  assert.equal(at(sun.sunrise, -61), 'night');
  assert.equal(at(sun.sunrise, -60), 'dawn');
  assert.equal(at(sun.sunrise, 59), 'dawn');
  assert.equal(at(sun.sunrise, 60), 'day');
  assert.equal(at(sun.sunset, -61), 'day');
  assert.equal(at(sun.sunset, -60), 'dusk');
  assert.equal(at(sun.sunset, 59), 'dusk');
  assert.equal(at(sun.sunset, 60), 'night');
});

test('skyState: summer noon is day, winter midnight is night', () => {
  assert.equal(skyState(new Date('2026-06-21T16:00:00Z'), LOC).phase, 'day');
  assert.equal(skyState(new Date('2026-12-21T05:00:00Z'), LOC).phase, 'night');
});

test('moonAt: new moon hidden, full moon visible, quarter waxing', () => {
  const fresh = moonAt(new Date('2026-10-10T18:00:00Z'));
  assert.ok(fresh.illumination < 0.03);
  assert.equal(fresh.visible, false);
  const full = moonAt(new Date('2026-10-26T06:00:00Z'));
  assert.ok(full.illumination > 0.97);
  assert.equal(full.visible, true);
  const quarter = moonAt(new Date('2026-10-18T12:00:00Z'));
  assert.equal(quarter.waxing, true);
  assert.ok(Math.abs(quarter.illumination - 0.5) < 0.05);
});

test('seasonAt maps months to seasons', () => {
  const s = iso => seasonAt(new Date(iso), TZ).season;
  assert.equal(s('2026-01-15T17:00:00Z'), 'winter');
  assert.equal(s('2026-04-15T17:00:00Z'), 'spring');
  assert.equal(s('2026-07-15T17:00:00Z'), 'summer');
  assert.equal(s('2026-10-15T17:00:00Z'), 'autumn');
  assert.equal(s('2026-12-15T17:00:00Z'), 'winter');
});

test('seasonAt holidays use the Toronto date, not UTC', () => {
  const h = iso => seasonAt(new Date(iso), TZ).holiday;
  assert.equal(h('2026-10-31T17:00:00Z'), 'halloween');
  assert.equal(h('2026-11-01T02:00:00Z'), 'halloween'); // 22:00 EDT Oct 31
  assert.equal(h('2026-11-01T05:00:00Z'), null); // 01:00 EDT Nov 1
  assert.equal(h('2026-12-31T17:00:00Z'), 'newyear');
  assert.equal(h('2027-01-01T17:00:00Z'), 'newyear');
  assert.equal(h('2026-07-01T17:00:00Z'), 'canadaday');
  assert.equal(h('2026-07-02T03:00:00Z'), 'canadaday'); // 23:00 EDT Jul 1
  assert.equal(h('2026-08-01T17:00:00Z'), null);
});

test('weatherKind maps OpenWeather condition ids', () => {
  assert.equal(weatherKind(null), 'none');
  assert.equal(weatherKind(800), 'clear');
  assert.equal(weatherKind(801), 'light-clouds');
  assert.equal(weatherKind(802), 'light-clouds');
  assert.equal(weatherKind(803), 'dense-clouds');
  assert.equal(weatherKind(804), 'dense-clouds');
  assert.equal(weatherKind(741), 'dense-clouds');
  assert.equal(weatherKind(211), 'rain');
  assert.equal(weatherKind(311), 'rain');
  assert.equal(weatherKind(502), 'rain');
  assert.equal(weatherKind(601), 'snow');
  assert.equal(weatherKind(999), 'none');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL with `Cannot find module '…/src/sky/phase.js'`

- [ ] **Step 3: Write `src/sky/phase.js`**

```js
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
```

- [ ] **Step 4: Write `src/sky/moon.js`**

```js
import { getMoonIllumination } from 'suncalc';

export function moonAt(now) {
  const { fraction, phase, waxing } = getMoonIllumination(now);
  return { phase, illumination: fraction, waxing, visible: fraction >= 0.03 };
}
```

- [ ] **Step 5: Write `src/sky/season.js`**

```js
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
```

- [ ] **Step 6: Write `src/sky/weather.js`**

```js
/** OpenWeather condition id → which weather layer the sky draws. */
export function weatherKind(conditionId) {
  if (conditionId == null) return 'none';
  const group = Math.floor(conditionId / 100);
  if (conditionId === 800) return 'clear';
  if (conditionId === 801 || conditionId === 802) return 'light-clouds';
  if (conditionId === 803 || conditionId === 804 || group === 7) return 'dense-clouds';
  if (group === 2 || group === 3 || group === 5) return 'rain';
  if (group === 6) return 'snow';
  return 'none';
}
```

- [ ] **Step 7: Write `src/sky/index.js`**

```js
import { sunTimes, phaseAt } from './phase.js';
import { moonAt } from './moon.js';
import { seasonAt } from './season.js';

export function skyState(now, location) {
  const sun = sunTimes(now, location);
  return { phase: phaseAt(now, sun), ...sun, moon: moonAt(now), ...seasonAt(now, location.timeZone) };
}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, all sky tests green.

- [ ] **Step 9: Commit**

```bash
git add src/sky test/sky.test.js
git -c user.name='Petro G' -c user.email='petro.gko@gmail.com' commit -m "feat: compute Toronto sky state (phase, moon, season, weather kind)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Constellation layout

**Files:**
- Create: `src/render/constellation.js`, `test/constellation.test.js`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `SLOTS: {x, y}[10]`, `EDGES: [number, number][]`
  - `layoutConstellation(languages: {name, bytes}[], toolStars: string[]) → { stars: { slot, x, y, r, label, kind: 'language' | 'tool' }[], edges: [slotA, slotB][] }`

- [ ] **Step 1: Write the failing test `test/constellation.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutConstellation, SLOTS } from '../src/render/constellation.js';

const TOOLS = ['docker', 'kubernetes', 'aws', 'llms'];

test('is deterministic', () => {
  const langs = [
    { name: 'HTML', bytes: 459 },
    { name: 'JavaScript', bytes: 435 },
  ];
  assert.deepEqual(layoutConstellation(langs, TOOLS), layoutConstellation(langs, TOOLS));
});

test('ranks languages by bytes into slots 0..5 (ties by name), tools into 6..9', () => {
  const { stars } = layoutConstellation(
    [
      { name: 'PHP', bytes: 71 },
      { name: 'HTML', bytes: 459 },
      { name: 'Go', bytes: 13 },
      { name: 'CSS', bytes: 13 },
    ],
    TOOLS
  );
  assert.deepEqual(
    stars.map(s => [s.slot, s.label, s.kind]),
    [
      [0, 'html', 'language'],
      [1, 'php', 'language'],
      [2, 'css', 'language'],
      [3, 'go', 'language'],
      [6, 'docker', 'tool'],
      [7, 'kubernetes', 'tool'],
      [8, 'aws', 'tool'],
      [9, 'llms', 'tool'],
    ]
  );
  assert.deepEqual({ x: stars[0].x, y: stars[0].y }, SLOTS[0]);
});

test('radius is 2.5 + 5*sqrt(share of all bytes); tools are 2.2', () => {
  const { stars } = layoutConstellation(
    [
      { name: 'A', bytes: 75 },
      { name: 'B', bytes: 25 },
    ],
    ['docker']
  );
  assert.equal(stars[0].r, 6.8); // 2.5 + 5*sqrt(0.75) = 6.83
  assert.equal(stars[1].r, 5); // 2.5 + 5*sqrt(0.25)
  assert.equal(stars[2].r, 2.2);
});

test('caps at six languages but uses all bytes for shares', () => {
  const langs = Array.from({ length: 8 }, (_, i) => ({ name: `L${i}`, bytes: 100 }));
  const { stars } = layoutConstellation(langs, []);
  assert.equal(stars.length, 6);
  assert.equal(stars[0].r, 4.3); // 2.5 + 5*sqrt(1/8) = 4.27
});

test('edges only connect occupied slots', () => {
  const none = layoutConstellation([], TOOLS);
  assert.deepEqual(none.stars.map(s => s.slot), [6, 7, 8, 9]);
  assert.deepEqual(none.edges, []);
  const two = layoutConstellation(
    [
      { name: 'A', bytes: 2 },
      { name: 'B', bytes: 1 },
    ],
    []
  );
  assert.deepEqual(two.edges, [[0, 1]]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL with `Cannot find module '…/src/render/constellation.js'`

- [ ] **Step 3: Write `src/render/constellation.js`**

```js
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/render/constellation.js test/constellation.test.js
git -c user.name='Petro G' -c user.email='petro.gko@gmail.com' commit -m "feat: lay out the skill constellation from language bytes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Hero renderer

**Files:**
- Create: `scripts/sample-data.js`, `src/render/hero.js`, `test/hero.test.js`
- Create (generated): `test/__snapshots__/hero-*.svg`

**Interfaces:**
- Consumes:
  - `escapeXml`, `svgDoc`, `THEMES`, `FONT_SANS`, `FONT_MONO`, `TWINKLE_CSS` (Task 2)
  - `weatherKind` (Task 3)
  - Constellation `{ stars, edges }` (Task 4)
- Produces:
  - `renderHero({ theme: 'dark' | 'light', sky: { phase, moon, season, holiday }, weatherId: number | null, constellation, greeting, taglines: string[], location: string }) → string`
  - `moonPath(cx, cy, r, { illumination, waxing }) → string`
  - `SAMPLE` (from `scripts/sample-data.js`) with keys `now, sky, weather, github`. `github` has keys `languages, featured, stats, activity`.

- [ ] **Step 1: Write `scripts/sample-data.js`** (shared fixture data for snapshots and the preview gallery)

```js
export const SAMPLE = {
  now: new Date('2026-10-01T19:17:00Z'),
  sky: {
    phase: 'night',
    sunrise: new Date('2026-10-01T11:15:00Z'),
    sunset: new Date('2026-10-01T22:58:00Z'),
    moon: { phase: 0.69, illumination: 0.7, waxing: false, visible: true },
    season: 'summer',
    holiday: null,
  },
  weather: { temp: 14.4, feelsLike: 13.2, conditionId: 801, description: 'few clouds' },
  github: {
    languages: [
      { name: 'HTML', bytes: 45900 },
      { name: 'JavaScript', bytes: 43500 },
      { name: 'PHP', bytes: 7100 },
      { name: 'CSS', bytes: 1800 },
      { name: 'Go', bytes: 1300 },
      { name: 'Python', bytes: 200 },
    ],
    featured: [
      {
        name: 'religion-history-timeline',
        title: 'Religion History Timeline',
        description:
          'Interactive star-chart timeline of 44 world religions: when and how each came out, key moments, sources, and which faiths grew out of which.',
        url: 'https://petrogko.com/religion-history-timeline/',
      },
      {
        name: 'politics-history-timeline',
        title: 'Politics History Timeline',
        description:
          'Interactive star-chart timeline of 45 political systems and ideologies, from tribal councils to national conservatism.',
        url: 'https://petrogko.com/politics-history-timeline/',
      },
    ],
    stats: { publicRepos: 96, stars: 3, followers: 10 },
    activity: [
      {
        emoji: '🚀',
        verb: 'Pushed to',
        target: 'politics-history-timeline',
        url: 'https://github.com/petrogko/politics-history-timeline',
        date: 'Oct 1',
      },
      { emoji: '⭐', verb: 'Starred', target: 'nvk/llm-wiki', url: 'https://github.com/nvk/llm-wiki', date: 'Sep 27' },
    ],
  },
};
```

- [ ] **Step 2: Write the failing test `test/hero.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderHero, moonPath } from '../src/render/hero.js';
import { layoutConstellation } from '../src/render/constellation.js';
import { findXmlError } from '../src/render/xml.js';
import { config } from '../src/config.js';
import { SAMPLE } from '../scripts/sample-data.js';
import { matchSnapshot } from './helpers/snapshot.js';

const constellation = layoutConstellation(SAMPLE.github.languages, config.toolStars);
const hero = (sky = {}, extra = {}) =>
  renderHero({
    theme: 'dark',
    sky: { ...SAMPLE.sky, ...sky },
    weatherId: null,
    constellation,
    greeting: config.greeting,
    taglines: config.taglines,
    location: 'Toronto',
    ...extra,
  });

const PHASES = ['dawn', 'day', 'dusk', 'night'];
const WEATHER = { none: null, clear: 800, 'light-clouds': 801, 'dense-clouds': 804, rain: 501, snow: 601 };

for (const phase of PHASES) {
  for (const [kind, weatherId] of Object.entries(WEATHER)) {
    test(`hero ${phase} × ${kind} is well-formed and stable`, () => {
      const svg = hero({ phase }, { weatherId });
      assert.equal(findXmlError(svg), null);
      matchSnapshot(`hero-${phase}-${kind}.svg`, svg);
    });
  }
}

for (const holiday of ['halloween', 'newyear', 'canadaday']) {
  test(`hero night × ${holiday} is well-formed and stable`, () => {
    const svg = hero({ phase: 'night', holiday, season: holiday === 'canadaday' ? 'summer' : 'autumn' });
    assert.equal(findXmlError(svg), null);
    matchSnapshot(`hero-night-${holiday}.svg`, svg);
  });
}

test('hero autumn day is well-formed and stable', () => {
  const svg = hero({ phase: 'day', season: 'autumn' }, { weatherId: 800 });
  assert.equal(findXmlError(svg), null);
  matchSnapshot('hero-day-autumn.svg', svg);
});

test('uses CSS animation only, no SMIL or external references', () => {
  for (const phase of PHASES) {
    const svg = hero({ phase }, { weatherId: 501 });
    assert.ok(!svg.includes('<animate'), phase);
    assert.ok(!svg.includes('href'), phase);
    assert.ok(!svg.includes('<image'), phase);
    assert.ok(svg.includes('prefers-reduced-motion'), phase);
  }
});

test('day: dashed constellation, nothing twinkles', () => {
  const svg = hero({ phase: 'day' });
  assert.ok(svg.includes('stroke-dasharray="3 4"'));
  assert.ok(!svg.includes('class="tw'));
});

test('night: aurora and visible moon; hidden at new moon', () => {
  const svg = hero({ phase: 'night' });
  assert.ok(svg.includes('id="aurora"'));
  assert.ok(svg.includes('fill="#f3f0e0"'));
  const dark = hero({ phase: 'night', moon: { phase: 0, illumination: 0.01, waxing: true, visible: false } });
  assert.ok(!dark.includes('fill="#f3f0e0"'));
});

test('holidays: orange moon even by day, fireworks, red-and-white aurora', () => {
  assert.ok(hero({ phase: 'day', holiday: 'halloween' }).includes('#ff9a3c'));
  assert.ok(hero({ phase: 'night', holiday: 'newyear' }).includes('class="burst b0"'));
  const canada = hero({ phase: 'night', holiday: 'canadaday' });
  assert.ok(canada.includes('stop-color: #d52b1e'));
});

test('autumn leaves fall unless it rains or snows; holidays override the season', () => {
  assert.ok(hero({ season: 'autumn' }, { weatherId: 800 }).includes('class="leaves"'));
  assert.ok(!hero({ season: 'autumn' }, { weatherId: 501 }).includes('class="leaves"'));
  assert.ok(!hero({ season: 'autumn' }, { weatherId: 601 }).includes('class="leaves"'));
  assert.ok(!hero({ season: 'autumn', holiday: 'halloween' }, { weatherId: 800 }).includes('class="leaves"'));
});

test('wave edge matches the page theme', () => {
  assert.ok(hero().includes('fill="#0d1117"/></svg>'));
  assert.ok(hero({}, { theme: 'light' }).includes('fill="#ffffff"/></svg>'));
});

test('taglines rotate and are escaped', () => {
  const svg = hero();
  assert.ok(svg.includes('Solutions &amp; DevOps Engineer · Toronto'));
  assert.ok(svg.includes('class="tl tl3"'));
  assert.ok(svg.includes('@keyframes cycle'));
  const single = hero({}, { taglines: ['Only one'] });
  assert.ok(!single.includes('class="tl'));
});

test('moonPath: half moon has a straight terminator; waxing lights the right side', () => {
  assert.equal(moonPath(10, 10, 5, { illumination: 0.5, waxing: true }), 'M10 5 A5 5 0 0 1 10 15 A0 5 0 0 1 10 5Z');
  assert.equal(moonPath(10, 10, 5, { illumination: 0.25, waxing: false }), 'M10 5 A5 5 0 0 0 10 15 A2.5 5 0 0 1 10 5Z');
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL with `Cannot find module '…/src/render/hero.js'`

- [ ] **Step 4: Write `src/render/hero.js`**

```js
import { escapeXml, svgDoc, THEMES, FONT_SANS, FONT_MONO, TWINKLE_CSS } from './svg.js';
import { weatherKind } from '../sky/weather.js';

export const HERO_WIDTH = 800;
export const HERO_HEIGHT = 260;

const r1 = n => Math.round(n * 10) / 10;

const SKIES = {
  dawn: {
    stops: [[0, '#1c2a5e'], [0.45, '#6b4c9a'], [0.78, '#e88a7d'], [1, '#f7c58b']],
    title: '#ffffff', subtitle: '#fde8e0', line: '#ffffff', star: '#ffffff', label: '#ffffff', stars: 4,
    sun: { cx: 620, cy: 236, r: 26, glow: 120, core: '#fff4d6', halo: '#ffd27a' },
  },
  day: {
    stops: [[0, '#2f6fd6'], [0.6, '#6fb0f0'], [1, '#bfe2fb']],
    title: '#0b1f3a', subtitle: '#173a6a', line: '#ffffff', star: '#ffffff', label: '#173a6a', stars: 0,
    sun: { cx: 700, cy: 60, r: 24, glow: 90, core: '#fffdf2', halo: '#fff1a8' },
  },
  dusk: {
    stops: [[0, '#241a52'], [0.42, '#7a2f7a'], [0.75, '#e0566b'], [1, '#f5a35c']],
    title: '#ffffff', subtitle: '#ffe0ea', line: '#ffd6f0', star: '#ffeaf6', label: '#ffe0ea', stars: 5,
    sun: { cx: 180, cy: 240, r: 28, glow: 130, core: '#ffd9a6', halo: '#ff8a5c' },
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
  return (
    `<g opacity="${opacity}"><circle cx="380" cy="46" r="16" fill="#2a3150" fill-opacity="0.5"/>` +
    `<path d="${moonPath(380, 46, 16, lit)}" fill="${color}"/></g>`
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

function taglineCss(count, seconds = 3) {
  if (count < 2) return '';
  const slot = 100 / count;
  const fade = slot * 0.12;
  const pct = n => Number(n.toFixed(2));
  const delays = Array.from({ length: count }, (_, i) => `.tl${i} { animation-delay: ${i * seconds}s; }`).join(' ');
  return (
    `.tl { opacity: 0; animation: cycle ${count * seconds}s linear infinite; } ${delays} ` +
    `@keyframes cycle { 0% { opacity: 0; } ${pct(fade)}% { opacity: 1; } ${pct(slot - fade)}% { opacity: 1; } ${pct(slot)}% { opacity: 0; } 100% { opacity: 0; } }`
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
  const leafX = 48 + [...greeting].length * 22 + 14;
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
```

- [ ] **Step 5: Run the tests to verify they pass (this also creates the snapshots)**

Run: `npm test`
Expected: PASS, and 28 files appear under `test/__snapshots__/hero-*.svg`.

- [ ] **Step 6: Eyeball four snapshots**

Run: `open test/__snapshots__/hero-dawn-clear.svg test/__snapshots__/hero-day-light-clouds.svg test/__snapshots__/hero-dusk-rain.svg test/__snapshots__/hero-night-none.svg`
Expected: each looks like the matching day-cycle mockup. Text must be readable and the constellation sits in the right half. If a value needs tweaking, change it in `hero.js`, then run `UPDATE_SNAPSHOTS=1 npm test`.

- [ ] **Step 7: Commit**

```bash
git add scripts/sample-data.js src/render/hero.js test/hero.test.js test/__snapshots__
git -c user.name='Petro G' -c user.email='petro.gko@gmail.com' commit -m "feat: render the living-sky hero (phases, weather, moon, seasons)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Cards (weather, stats, featured, skills, buttons)

**Files:**
- Create: `src/render/cards.js`, `test/cards.test.js`
- Create (generated): `test/__snapshots__/card-*.svg`

**Interfaces:**
- Consumes:
  - `escapeXml`, `wrapText`, `hashString`, `seededRandom`, `hslToHex`, `svgDoc`, `THEMES`, `FONT_SANS`, `TWINKLE_CSS` (Task 2)
  - `weatherKind` (Task 3)
  - `formatClock` (Task 1)
- Produces:
  - `renderWeatherCard({ theme, weather: { temp, feelsLike, conditionId, description } | null, sky: { phase, sunrise, sunset }, timeZone, city }) → string`
  - `renderStatsCard({ theme, stats: { publicRepos, stars, followers } | null, languages: {name, bytes}[], stamp: string }) → string`
  - `renderFeaturedCard({ theme, repo: { name, title, description, url } }) → string`
  - `renderSkills({ theme, skills: {icon, label}[] }) → string`
  - `renderButton({ theme, icon, label }) → string`

- [ ] **Step 1: Write the failing test `test/cards.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderWeatherCard,
  renderStatsCard,
  renderFeaturedCard,
  renderSkills,
  renderButton,
} from '../src/render/cards.js';
import { findXmlError } from '../src/render/xml.js';
import { config } from '../src/config.js';
import { SAMPLE } from '../scripts/sample-data.js';
import { matchSnapshot } from './helpers/snapshot.js';

const TZ = config.location.timeZone;
const THEMES = ['dark', 'light'];

for (const theme of THEMES) {
  test(`cards (${theme}) are well-formed and stable`, () => {
    const cards = {
      weather: renderWeatherCard({ theme, weather: SAMPLE.weather, sky: SAMPLE.sky, timeZone: TZ, city: 'Toronto' }),
      'weather-unavailable': renderWeatherCard({ theme, weather: null, sky: SAMPLE.sky, timeZone: TZ, city: 'Toronto' }),
      stats: renderStatsCard({
        theme,
        stats: SAMPLE.github.stats,
        languages: SAMPLE.github.languages,
        stamp: 'Thu 1 Oct, 15:17 EDT',
      }),
      featured: renderFeaturedCard({ theme, repo: SAMPLE.github.featured[0] }),
      skills: renderSkills({ theme, skills: config.skills }),
      button: renderButton({ theme, icon: '🌐', label: 'petrogko.com' }),
    };
    for (const [name, svg] of Object.entries(cards)) {
      assert.equal(findXmlError(svg), null, name);
      matchSnapshot(`card-${name}-${theme}.svg`, svg);
    }
  });
}

test('weather card shows rounded temperature, sentence-case description and sun times', () => {
  const svg = renderWeatherCard({ theme: 'dark', weather: SAMPLE.weather, sky: SAMPLE.sky, timeZone: TZ, city: 'Toronto' });
  assert.ok(svg.includes('>14°<'));
  assert.ok(svg.includes('>Few clouds<'));
  assert.ok(svg.includes('feels like 13°'));
  assert.ok(svg.includes('☀︎ 07:15  ·  ☾ 18:58'));
  assert.ok(svg.includes('TORONTO NOW'));
});

test('weather card unavailable state keeps sun times', () => {
  const svg = renderWeatherCard({ theme: 'light', weather: null, sky: SAMPLE.sky, timeZone: TZ, city: 'Toronto' });
  assert.ok(svg.includes('Toronto · weather unavailable'));
  assert.ok(svg.includes('☀︎ 07:15'));
});

test('stats card shows dashes without data and the update stamp', () => {
  const svg = renderStatsCard({ theme: 'dark', stats: null, languages: [], stamp: 'Thu 1 Oct, 15:17 EDT' });
  assert.equal((svg.match(/>–</g) ?? []).length, 3);
  assert.ok(svg.includes('updated Thu 1 Oct, 15:17 EDT'));
  assert.ok(svg.includes('no language data'));
});

test('stats card legend lists the top four languages', () => {
  const svg = renderStatsCard({
    theme: 'dark',
    stats: SAMPLE.github.stats,
    languages: SAMPLE.github.languages,
    stamp: 'x',
  });
  assert.ok(svg.includes('html · javascript · php · css'));
  assert.ok(!svg.includes('python'));
});

test('featured card escapes markup and hard-wraps long tokens', () => {
  const svg = renderFeaturedCard({
    theme: 'dark',
    repo: {
      name: 'x',
      title: 'Tom & <Jerry>',
      description: `Uses "quotes" & <b>tags</b> plus ${'a'.repeat(60)} end`,
      url: 'https://example.com',
    },
  });
  assert.equal(findXmlError(svg), null);
  assert.ok(svg.includes('Tom &amp; &lt;Jerry&gt;'));
  assert.ok(svg.includes('&quot;quotes&quot; &amp; &lt;b&gt;tags&lt;/b&gt;'));
  assert.ok(svg.includes(`>${'a'.repeat(52)}<`));
});

test('featured card art is deterministic per repo name', () => {
  const a = renderFeaturedCard({ theme: 'dark', repo: SAMPLE.github.featured[0] });
  const b = renderFeaturedCard({ theme: 'dark', repo: SAMPLE.github.featured[0] });
  const c = renderFeaturedCard({ theme: 'dark', repo: SAMPLE.github.featured[1] });
  assert.equal(a, b);
  assert.notEqual(a.match(/<polyline[^>]*>/)[0], c.match(/<polyline[^>]*>/)[0]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL with `Cannot find module '…/src/render/cards.js'`

- [ ] **Step 3: Write `src/render/cards.js`**

```js
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, and 12 files appear under `test/__snapshots__/card-*.svg`.

- [ ] **Step 5: Eyeball the cards**

Run: `open test/__snapshots__/card-weather-dark.svg test/__snapshots__/card-stats-light.svg test/__snapshots__/card-featured-dark.svg test/__snapshots__/card-skills-dark.svg`
Expected: text sits inside the card, nothing is clipped, and the pills are centred. Adjust and rerun `UPDATE_SNAPSHOTS=1 npm test` if needed.

- [ ] **Step 6: Commit**

```bash
git add src/render/cards.js test/cards.test.js test/__snapshots__
git -c user.name='Petro G' -c user.email='petro.gko@gmail.com' commit -m "feat: render weather, stats, featured, skills and button cards" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Data sources (HTTP, OpenWeather, GitHub)

**Files:**
- Create: `src/sources/http.js`, `src/sources/weather.js`, `src/sources/github.js`, `test/helpers/fakeFetch.js`, `test/fixtures/github.js`, `test/sources.test.js`

**Interfaces:**
- Consumes: `formatShortDate` (Task 1)
- Produces:
  - `fetchJson(fetchImpl, url, { headers?, timeoutMs = 10000, retries = 1 }) → Promise<any>`, which throws `HttpError` (with `.status`) or a network error. Messages redact `appid=`.
  - `fetchWeather({ fetch, apiKey, lat, lon }) → Promise<{ temp, feelsLike, conditionId, description }>`. Throws `MissingKeyError` without making a request when `apiKey` is empty.
  - `fetchGithub({ fetch, token, user, excludeRepos, featuredTopic, maxFeatured, activityLimit, timeZone }) → Promise<{ languages: {name, bytes}[], featured: {name, title, description, url}[], stats: {publicRepos, stars, followers}, activity: {emoji, verb, target, url, date}[] }>`
  - Helpers: `sumLanguages(maps)`, `humanize(name)`, `pickFeatured(repos, topic, max)`, `describeEvent(event, user)`, `mapEvents(events, { user, timeZone, limit })`
  - Test helpers: `fakeFetch(routes)` with `.calls: string[]`, and `reply(status, body)`

- [ ] **Step 1: Write `test/helpers/fakeFetch.js`**

```js
/** Route values: a JSON body, reply(status, body), or a function returning either (or throwing). Keys are path+query. */
export function fakeFetch(routes) {
  const calls = [];
  async function impl(url) {
    calls.push(url);
    const path = url.replace(/^https:\/\/[^/]+/, '');
    if (!(path in routes)) throw new Error(`unexpected request ${path}`);
    let route = routes[path];
    if (typeof route === 'function') route = route();
    const { status, body } = route?.__reply ? route : { status: 200, body: route };
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  }
  impl.calls = calls;
  return impl;
}

export const reply = (status, body = {}) => ({ __reply: true, status, body });
```

- [ ] **Step 2: Write `test/fixtures/github.js`**

```js
export const EVENTS = [
  { type: 'PushEvent', repo: { name: 'petrogko/politics-history-timeline' }, payload: {}, created_at: '2026-10-01T13:00:00Z' },
  { type: 'PushEvent', repo: { name: 'petrogko/politics-history-timeline' }, payload: {}, created_at: '2026-10-01T12:00:00Z' },
  { type: 'CreateEvent', repo: { name: 'petrogko/osiris' }, payload: { ref_type: 'branch' }, created_at: '2026-09-30T12:00:00Z' },
  { type: 'WatchEvent', repo: { name: 'nvk/llm-wiki' }, payload: { action: 'started' }, created_at: '2026-09-27T15:00:00Z' },
  { type: 'PullRequestEvent', repo: { name: 'petrogko/osiris' }, payload: { action: 'opened', pull_request: { number: 3 } }, created_at: '2026-09-23T14:00:00Z' },
  { type: 'PullRequestEvent', repo: { name: 'petrogko/osiris' }, payload: { action: 'merged', pull_request: { number: 2 } }, created_at: '2026-09-22T14:00:00Z' },
  { type: 'PullRequestEvent', repo: { name: 'petrogko/osiris' }, payload: { action: 'closed', pull_request: { number: 1, merged: false } }, created_at: '2026-09-21T14:00:00Z' },
  { type: 'ReleaseEvent', repo: { name: 'petrogko/grpc-example' }, payload: { action: 'published', release: { tag_name: 'v1.2.0' } }, created_at: '2026-09-20T03:00:00Z' },
  { type: 'ForkEvent', repo: { name: 'simplifaisoul/osiris' }, payload: {}, created_at: '2026-09-18T14:00:00Z' },
];

const repo = (name, extra) => ({
  name,
  full_name: `petrogko/${name}`,
  fork: false,
  private: false,
  stargazers_count: 0,
  topics: [],
  homepage: null,
  html_url: `https://github.com/petrogko/${name}`,
  description: null,
  pushed_at: '2023-01-01T00:00:00Z',
  ...extra,
});

export const REPOS = [
  repo('religion-history-timeline', {
    stargazers_count: 2,
    topics: ['featured'],
    homepage: 'https://petrogko.com/religion-history-timeline/',
    description: 'Interactive star-chart timeline of 44 world religions.',
    pushed_at: '2026-10-01T12:00:00Z',
  }),
  repo('politics-history-timeline', {
    stargazers_count: 1,
    topics: ['featured', 'd3'],
    homepage: '',
    description: 'Political systems & ideologies <from tribes>.',
    pushed_at: '2026-10-01T13:00:00Z',
  }),
  repo('grpc-example', { pushed_at: '2023-02-23T00:00:00Z' }),
  repo('osiris', { fork: true, stargazers_count: 5, topics: ['featured'] }),
];

export function githubRoutes(overrides = {}) {
  return {
    '/users/petrogko': { public_repos: 96, followers: 10 },
    '/users/petrogko/repos?type=owner&per_page=100&page=1': REPOS,
    '/repos/petrogko/religion-history-timeline/languages': { HTML: 9000, JavaScript: 1000 },
    '/repos/petrogko/politics-history-timeline/languages': { HTML: 8000, CSS: 500 },
    '/repos/petrogko/grpc-example/languages': { Go: 1500 },
    '/users/petrogko/events/public?per_page=30': EVENTS,
    ...overrides,
  };
}
```

- [ ] **Step 3: Write the failing test `test/sources.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchJson, HttpError } from '../src/sources/http.js';
import { fetchWeather, MissingKeyError } from '../src/sources/weather.js';
import { fetchGithub, mapEvents, humanize } from '../src/sources/github.js';
import { fakeFetch, reply } from './helpers/fakeFetch.js';
import { githubRoutes, EVENTS } from './fixtures/github.js';

const TZ = 'America/Toronto';
const WEATHER_PATH = '/data/2.5/weather?lat=43.6532&lon=-79.3832&units=metric&appid=SECRET';
const OW = { main: { temp: 14.4, feels_like: 13.2 }, weather: [{ id: 801, description: 'few clouds' }] };
const gh = fetch =>
  fetchGithub({ fetch, token: 't', user: 'petrogko', excludeRepos: [], featuredTopic: 'featured', maxFeatured: 4, activityLimit: 5, timeZone: TZ });

test('fetchJson retries once, then succeeds', async () => {
  let n = 0;
  const f = fakeFetch({ '/x': () => (++n === 1 ? reply(502) : { ok: 1 }) });
  assert.deepEqual(await fetchJson(f, 'https://h/x'), { ok: 1 });
  assert.equal(f.calls.length, 2);
});

test('fetchJson gives up after one retry with HttpError', async () => {
  const f = fakeFetch({ '/x': reply(500) });
  await assert.rejects(fetchJson(f, 'https://h/x'), err => err instanceof HttpError && err.status === 500);
  assert.equal(f.calls.length, 2);
});

test('fetchJson redacts appid from error messages', async () => {
  const f = fakeFetch({ [WEATHER_PATH]: reply(401) });
  await assert.rejects(fetchJson(f, `https://api.openweathermap.org${WEATHER_PATH}`), err => {
    assert.ok(!err.message.includes('SECRET'), err.message);
    assert.ok(err.message.includes('appid=***'));
    return true;
  });
});

test('fetchWeather maps the OpenWeather response', async () => {
  const f = fakeFetch({ [WEATHER_PATH]: OW });
  assert.deepEqual(await fetchWeather({ fetch: f, apiKey: 'SECRET', lat: 43.6532, lon: -79.3832 }), {
    temp: 14.4,
    feelsLike: 13.2,
    conditionId: 801,
    description: 'few clouds',
  });
});

test('fetchWeather without a key throws MissingKeyError and makes no request', async () => {
  const f = fakeFetch({});
  await assert.rejects(fetchWeather({ fetch: f, apiKey: '', lat: 1, lon: 2 }), MissingKeyError);
  assert.equal(f.calls.length, 0);
});

test('fetchWeather rejects an unexpected shape', async () => {
  const f = fakeFetch({ [WEATHER_PATH]: { cod: 200 } });
  await assert.rejects(fetchWeather({ fetch: f, apiKey: 'SECRET', lat: 43.6532, lon: -79.3832 }), /Unexpected/);
});

test('fetchGithub aggregates public non-fork data', async () => {
  const data = await gh(fakeFetch(githubRoutes()));
  assert.deepEqual(data.languages, [
    { name: 'HTML', bytes: 17000 },
    { name: 'Go', bytes: 1500 },
    { name: 'JavaScript', bytes: 1000 },
    { name: 'CSS', bytes: 500 },
  ]);
  assert.deepEqual(data.stats, { publicRepos: 96, stars: 3, followers: 10 });
  assert.deepEqual(
    data.featured.map(f => [f.name, f.title, f.url]),
    [
      ['politics-history-timeline', 'Politics History Timeline', 'https://github.com/petrogko/politics-history-timeline'],
      ['religion-history-timeline', 'Religion History Timeline', 'https://petrogko.com/religion-history-timeline/'],
    ]
  );
  assert.equal(data.activity.length, 5);
});

test('fetchGithub fails as a whole when any languages call fails', async () => {
  const f = fakeFetch(githubRoutes({ '/repos/petrogko/grpc-example/languages': reply(500) }));
  await assert.rejects(gh(f), HttpError);
});

test('fetchGithub caps featured repos at maxFeatured', async () => {
  const data = await fetchGithub({
    fetch: fakeFetch(githubRoutes()),
    token: '',
    user: 'petrogko',
    excludeRepos: [],
    featuredTopic: 'featured',
    maxFeatured: 1,
    activityLimit: 5,
    timeZone: TZ,
  });
  assert.deepEqual(data.featured.map(f => f.name), ['politics-history-timeline']);
});

test('mapEvents maps, dedupes per day, ignores noise, and respects the limit', () => {
  assert.deepEqual(mapEvents(EVENTS, { user: 'petrogko', timeZone: TZ, limit: 10 }), [
    { emoji: '🚀', verb: 'Pushed to', target: 'politics-history-timeline', url: 'https://github.com/petrogko/politics-history-timeline', date: 'Oct 1' },
    { emoji: '⭐', verb: 'Starred', target: 'nvk/llm-wiki', url: 'https://github.com/nvk/llm-wiki', date: 'Sep 27' },
    { emoji: '🔀', verb: 'Opened a pull request in', target: 'osiris', url: 'https://github.com/petrogko/osiris', date: 'Sep 23' },
    { emoji: '✅', verb: 'Merged a pull request in', target: 'osiris', url: 'https://github.com/petrogko/osiris', date: 'Sep 22' },
    { emoji: '🏷️', verb: 'Released v1.2.0 of', target: 'grpc-example', url: 'https://github.com/petrogko/grpc-example', date: 'Sep 19' },
    { emoji: '🍴', verb: 'Forked', target: 'simplifaisoul/osiris', url: 'https://github.com/simplifaisoul/osiris', date: 'Sep 18' },
  ]);
  assert.equal(mapEvents(EVENTS, { user: 'petrogko', timeZone: TZ, limit: 2 }).length, 2);
});

test('release date uses the Toronto calendar day (03:00Z → previous day)', () => {
  const [release] = mapEvents([EVENTS[7]], { user: 'petrogko', timeZone: TZ, limit: 5 });
  assert.equal(release.date, 'Sep 19');
});

test('merged pull requests are detected in the legacy payload shape too', () => {
  const legacy = { type: 'PullRequestEvent', repo: { name: 'petrogko/x' }, payload: { action: 'closed', pull_request: { merged: true } }, created_at: '2026-09-01T12:00:00Z' };
  assert.equal(mapEvents([legacy], { user: 'petrogko', timeZone: TZ, limit: 5 })[0].verb, 'Merged a pull request in');
});

test('humanize turns repo slugs into titles', () => {
  assert.equal(humanize('religion-history-timeline'), 'Religion History Timeline');
  assert.equal(humanize('grpc_example'), 'Grpc Example');
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL with `Cannot find module '…/src/sources/http.js'`

- [ ] **Step 5: Write `src/sources/http.js`**

```js
const redact = url => String(url).replace(/appid=[^&]*/g, 'appid=***');

export class HttpError extends Error {
  constructor(status, url) {
    super(`HTTP ${status} for ${redact(url)}`);
    this.name = 'HttpError';
    this.status = status;
  }
}

/** GET + JSON with a timeout and `retries` extra attempts. Never leaks `appid` in messages. */
export async function fetchJson(fetchImpl, url, { headers = {}, timeoutMs = 10_000, retries = 1 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchImpl(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) throw new HttpError(res.status, url);
      return await res.json();
    } catch (err) {
      lastError = err instanceof HttpError ? err : new Error(redact(err?.message ?? err));
    }
  }
  throw lastError;
}
```

- [ ] **Step 6: Write `src/sources/weather.js`**

```js
import { fetchJson } from './http.js';

export class MissingKeyError extends Error {
  constructor() {
    super('OPEN_WEATHER_MAP_KEY is not set');
    this.name = 'MissingKeyError';
  }
}

export async function fetchWeather({ fetch: fetchImpl = globalThis.fetch, apiKey, lat, lon }) {
  if (!apiKey) throw new MissingKeyError();
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${encodeURIComponent(apiKey)}`;
  const r = await fetchJson(fetchImpl, url);
  const w = r?.weather?.[0];
  if (typeof r?.main?.temp !== 'number' || !w) throw new Error('Unexpected OpenWeather response shape');
  return {
    temp: r.main.temp,
    feelsLike: typeof r.main.feels_like === 'number' ? r.main.feels_like : r.main.temp,
    conditionId: w.id,
    description: w.description ?? '',
  };
}
```

- [ ] **Step 7: Write `src/sources/github.js`**

```js
import { fetchJson } from './http.js';
import { formatShortDate } from '../time.js';

const API = 'https://api.github.com';

export async function fetchGithub({
  fetch: fetchImpl = globalThis.fetch,
  token,
  user,
  excludeRepos = [],
  featuredTopic = 'featured',
  maxFeatured = 4,
  activityLimit = 5,
  timeZone,
}) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': `${user}-profile-readme`,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const get = path => fetchJson(fetchImpl, `${API}${path}`, { headers });
  const [profile, repos, events] = await Promise.all([
    get(`/users/${user}`),
    listRepos(get, user),
    get(`/users/${user}/events/public?per_page=30`),
  ]);
  const own = repos.filter(r => !r.fork && !r.private && !excludeRepos.includes(r.name));
  const languageMaps = await Promise.all(own.map(r => get(`/repos/${r.full_name}/languages`)));
  return {
    languages: sumLanguages(languageMaps),
    featured: pickFeatured(own, featuredTopic, maxFeatured),
    stats: {
      publicRepos: profile.public_repos,
      stars: own.reduce((sum, r) => sum + (r.stargazers_count ?? 0), 0),
      followers: profile.followers,
    },
    activity: mapEvents(events, { user, timeZone, limit: activityLimit }),
  };
}

async function listRepos(get, user) {
  const all = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await get(`/users/${user}/repos?type=owner&per_page=100&page=${page}`);
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

export function sumLanguages(maps) {
  const totals = new Map();
  for (const m of maps) for (const [name, bytes] of Object.entries(m)) totals.set(name, (totals.get(name) ?? 0) + bytes);
  return [...totals]
    .map(([name, bytes]) => ({ name, bytes }))
    .sort((a, b) => b.bytes - a.bytes || a.name.localeCompare(b.name));
}

export function humanize(name) {
  return name
    .split(/[-_]+/)
    .filter(Boolean)
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

export function pickFeatured(repos, topic, max) {
  return repos
    .filter(r => (r.topics ?? []).includes(topic))
    .sort((a, b) => Date.parse(b.pushed_at) - Date.parse(a.pushed_at))
    .slice(0, max)
    .map(r => ({ name: r.name, title: humanize(r.name), description: r.description ?? '', url: r.homepage || r.html_url }));
}

export function describeEvent(event, user) {
  const full = event.repo?.name;
  if (!full) return null;
  const own = full.startsWith(`${user}/`) ? full.slice(user.length + 1) : full;
  const url = `https://github.com/${full}`;
  const p = event.payload ?? {};
  switch (event.type) {
    case 'PushEvent':
      return { emoji: '🚀', verb: 'Pushed to', target: own, url };
    case 'PullRequestEvent':
      if (p.action === 'opened') return { emoji: '🔀', verb: 'Opened a pull request in', target: own, url };
      if (p.action === 'merged' || (p.action === 'closed' && p.pull_request?.merged === true))
        return { emoji: '✅', verb: 'Merged a pull request in', target: own, url };
      return null;
    case 'CreateEvent':
      return p.ref_type === 'repository' ? { emoji: '✨', verb: 'Created', target: own, url } : null;
    case 'ReleaseEvent':
      return p.action === 'published'
        ? { emoji: '🏷️', verb: `Released ${p.release?.tag_name ?? 'a new version'} of`, target: own, url }
        : null;
    case 'IssuesEvent':
      return p.action === 'opened' ? { emoji: '🐛', verb: 'Opened an issue in', target: own, url } : null;
    case 'WatchEvent':
      return { emoji: '⭐', verb: 'Starred', target: full, url };
    case 'ForkEvent':
      return { emoji: '🍴', verb: 'Forked', target: full, url };
    default:
      return null;
  }
}

/** Newest first (API order). Collapses identical lines on the same Toronto day. */
export function mapEvents(events, { user, timeZone, limit }) {
  const out = [];
  const seen = new Set();
  for (const event of events) {
    const line = describeEvent(event, user);
    if (!line) continue;
    const date = formatShortDate(new Date(event.created_at), timeZone);
    const key = `${line.emoji} ${line.verb} ${line.target}|${date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...line, date });
    if (out.length >= limit) break;
  }
  return out;
}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/sources test/helpers/fakeFetch.js test/fixtures/github.js test/sources.test.js
git -c user.name='Petro G' -c user.email='petro.gko@gmail.com' commit -m "feat: fetch OpenWeather and public GitHub data with timeouts and retries" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Last-good fallback store

**Files:**
- Create: `src/lastGood.js`, `test/lastGood.test.js`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `WEATHER_MAX_AGE_MS` (6h)
  - `readLastGood(path) → { weather?: { data, fetchedAt }, github?: { data, fetchedAt } }`. Returns `{}` when the file is missing, corrupt or not an object.
  - `freshWeather(lastGood, now, maxAgeMs?) → data | null`
  - `anyGithub(lastGood) → data | null`
  - `writeLastGood(path, record)`, which creates parent directories

- [ ] **Step 1: Write the failing test `test/lastGood.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readLastGood, freshWeather, anyGithub, writeLastGood } from '../src/lastGood.js';

const dir = () => mkdtempSync(join(tmpdir(), 'lastgood-'));
const NOW = new Date('2026-10-01T19:17:00Z');
const hoursAgo = h => new Date(NOW.getTime() - h * 3_600_000).toISOString();

test('missing file → empty record', () => {
  assert.deepEqual(readLastGood(join(dir(), 'nope.json')), {});
});

test('corrupt, truncated or non-object JSON → empty record', () => {
  const d = dir();
  for (const [name, content] of [
    ['a.json', '{"weather": {'],
    ['b.json', ''],
    ['c.json', '[1,2]'],
    ['d.json', 'null'],
  ]) {
    writeFileSync(join(d, name), content);
    assert.deepEqual(readLastGood(join(d, name)), {}, name);
  }
});

test('freshWeather accepts up to 6h, rejects older, future or missing', () => {
  const at = fetchedAt => ({ weather: { data: { temp: 1 }, fetchedAt } });
  assert.deepEqual(freshWeather(at(hoursAgo(2)), NOW), { temp: 1 });
  assert.deepEqual(freshWeather(at(hoursAgo(6)), NOW), { temp: 1 });
  assert.equal(freshWeather(at(hoursAgo(6.01)), NOW), null);
  assert.equal(freshWeather(at(hoursAgo(-1)), NOW), null);
  assert.equal(freshWeather({}, NOW), null);
});

test('anyGithub has no age limit', () => {
  assert.deepEqual(anyGithub({ github: { data: { a: 1 }, fetchedAt: '2020-01-01T00:00:00Z' } }), { a: 1 });
  assert.equal(anyGithub({}), null);
});

test('writeLastGood creates directories and round-trips', () => {
  const file = join(dir(), 'data', 'last-good.json');
  const record = { weather: { data: { temp: 3 }, fetchedAt: NOW.toISOString() } };
  writeLastGood(file, record);
  assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), record);
  assert.deepEqual(readLastGood(file), record);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL with `Cannot find module '…/src/lastGood.js'`

- [ ] **Step 3: Write `src/lastGood.js`**

```js
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lastGood.js test/lastGood.test.js
git -c user.name='Petro G' -c user.email='petro.gko@gmail.com' commit -m "feat: persist last good data for fail-soft rendering" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: README template and renderer

**Files:**
- Create: `templates/README.mustache`, `src/readme.js`, `test/readme.test.js`

**Interfaces:**
- Consumes:
  - `config` (Task 1): `outputBase`, `links`, `skills`
  - GitHub `featured` and `activity` shapes (Task 7)
- Produces:
  - `renderReadme({ base, featured, activity, links, skills }) → string`
  - `escapeHtml(value) → string`, which escapes `& < > "` only

- [ ] **Step 1: Write the failing test `test/readme.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderReadme } from '../src/readme.js';
import { config } from '../src/config.js';
import { SAMPLE } from '../scripts/sample-data.js';

const render = (over = {}) =>
  renderReadme({
    base: config.outputBase,
    featured: SAMPLE.github.featured,
    activity: SAMPLE.github.activity,
    links: config.links,
    skills: config.skills,
    ...over,
  });

test('links every image to the output branch with dark/light sources', () => {
  const md = render();
  for (const name of ['hero', 'skills', 'weather', 'stats', 'snake', 'btn-site', 'btn-linkedin', 'btn-coffee']) {
    assert.ok(md.includes(`srcset="${config.outputBase}/${name}-dark.svg"`), name);
    assert.ok(md.includes(`src="${config.outputBase}/${name}-light.svg"`), name);
  }
  assert.ok(!md.includes('&#x2F;'));
});

test('renders featured cards linked to their homepages', () => {
  const md = render();
  assert.ok(md.includes('### ✦ Featured'));
  assert.ok(md.includes('<a href="https://petrogko.com/religion-history-timeline/">'));
  assert.ok(md.includes('featured-politics-history-timeline-dark.svg'));
});

test('omits the featured section when there are none', () => {
  assert.ok(!render({ featured: [] }).includes('Featured'));
});

test('renders the activity feed with absolute dates', () => {
  const md = render();
  assert.ok(md.includes('- 🚀 Pushed to [**politics-history-timeline**](https://github.com/petrogko/politics-history-timeline) <sub>· Oct 1</sub>'));
  assert.ok(!md.includes('Quiet lately'));
});

test('shows a quiet-lately line when there is no activity', () => {
  assert.ok(render({ activity: [] }).includes("_Quiet lately. See what I'm building at [petrogko.com](https://petrogko.com)._"));
});

test('escapes descriptions in alt text', () => {
  const md = render({
    featured: [{ name: 'x', title: 'X', description: 'Systems & ideologies <from tribes> "quoted"', url: 'https://e.com/a' }],
  });
  assert.ok(md.includes('alt="X: Systems &amp; ideologies &lt;from tribes&gt; &quot;quoted&quot;"'));
});

test('skills alt text comes from config', () => {
  assert.ok(render().includes('alt="Skills: Python, TypeScript, Go, Docker, Kubernetes, AWS, Linux, LLMs"'));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL with `Cannot find module '…/src/readme.js'`

- [ ] **Step 3: Write `templates/README.mustache`**

```mustache
<!-- Generated by src/readme.js from templates/README.mustache. Edit the template, not this file. -->

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="{{base}}/hero-dark.svg">
    <img src="{{base}}/hero-light.svg" width="100%" alt="Petro G, Solutions and DevOps Engineer in Toronto, under a live Toronto sky">
  </picture>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="{{base}}/skills-dark.svg">
    <img src="{{base}}/skills-light.svg" width="100%" alt="Skills: {{skillsAlt}}">
  </picture>
</p>

### About

I'm a Solutions & DevOps engineer in Toronto. My day job is keeping infrastructure reliable. In my own time I build things on top of it: AI-powered apps, a self-hosted homelab, security tooling, and interactive data visualizations.

🤖 Building small AI apps with LLMs<br>
🏠 Running and automating a homelab<br>
🔐 Writing security scripts and tooling<br>
✨ Charting history as interactive star maps

{{#hasFeatured}}
### ✦ Featured

<p>
{{#featured}}
<a href="{{url}}"><picture><source media="(prefers-color-scheme: dark)" srcset="{{base}}/featured-{{name}}-dark.svg"><img src="{{base}}/featured-{{name}}-light.svg" width="49%" alt="{{title}}: {{description}}"></picture></a>
{{/featured}}
</p>

{{/hasFeatured}}
### ✦ Live from Toronto

<p>
<picture><source media="(prefers-color-scheme: dark)" srcset="{{base}}/weather-dark.svg"><img src="{{base}}/weather-light.svg" width="49%" alt="Live Toronto weather"></picture>
<picture><source media="(prefers-color-scheme: dark)" srcset="{{base}}/stats-dark.svg"><img src="{{base}}/stats-light.svg" width="49%" alt="GitHub stats and top languages"></picture>
</p>

**Recent activity**

{{#hasActivity}}
{{#activity}}
- {{emoji}} {{verb}} [**{{target}}**]({{url}}) <sub>· {{date}}</sub>
{{/activity}}
{{/hasActivity}}
{{^hasActivity}}
_Quiet lately. See what I'm building at [petrogko.com](https://petrogko.com)._
{{/hasActivity}}

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="{{base}}/snake-dark.svg">
    <img src="{{base}}/snake-light.svg" width="100%" alt="Contribution graph being eaten by a snake">
  </picture>
</p>

### Connect

<p align="center">
<a href="{{links.site}}"><picture><source media="(prefers-color-scheme: dark)" srcset="{{base}}/btn-site-dark.svg"><img src="{{base}}/btn-site-light.svg" alt="petrogko.com"></picture></a>
<a href="{{links.linkedin}}"><picture><source media="(prefers-color-scheme: dark)" srcset="{{base}}/btn-linkedin-dark.svg"><img src="{{base}}/btn-linkedin-light.svg" alt="LinkedIn"></picture></a>
<a href="{{links.coffee}}"><picture><source media="(prefers-color-scheme: dark)" srcset="{{base}}/btn-coffee-dark.svg"><img src="{{base}}/btn-coffee-light.svg" alt="Buy me a coffee"></picture></a>
</p>

<p align="center"><sub>✦ This README updates itself every hour ✦</sub></p>
```

- [ ] **Step 4: Write `src/readme.js`**

```js
import { readFileSync } from 'node:fs';
import Mustache from 'mustache';

const TEMPLATE = new URL('../templates/README.mustache', import.meta.url);

/** HTML-escape for attributes and text, but leave `/` and `=` alone so URLs stay readable. */
export function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderReadme({ base, featured, activity, links, skills }) {
  const view = {
    base,
    featured,
    hasFeatured: featured.length > 0,
    activity,
    hasActivity: activity.length > 0,
    links,
    skillsAlt: skills.map(s => s.label).join(', '),
  };
  return Mustache.render(readFileSync(TEMPLATE, 'utf8'), view, {}, { escape: escapeHtml });
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add templates/README.mustache src/readme.js test/readme.test.js
git -c user.name='Petro G' -c user.email='petro.gko@gmail.com' commit -m "feat: add README template with featured, live and activity sections" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Orchestrator and CLI

**Files:**
- Create: `src/index.js`, `test/index.test.js`
- Modify: `README.md` (regenerated from real public data in Step 5)

**Interfaces:**
- Consumes: every module above.
- Produces:
  - `renderFiles({ sky, weather, github, now }) → Map<string, string>`, mapping file name to SVG
  - `run({ now?, fetchImpl?, env?, outDir?, readmePath?, lastGoodPath?, log? }) → Promise<{ weatherSource: 'live' | 'fallback' | 'none', githubSource: 'live' | 'fallback', files: string[] }>`. It rejects when GitHub data and fallback are both missing, and when any SVG is malformed.
  - CLI: `node src/index.js --out dist [--readme README.md] [--last-good .cache/last-good.json]`

- [ ] **Step 1: Write the failing test `test/index.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from '../src/index.js';
import { fakeFetch, reply } from './helpers/fakeFetch.js';
import { githubRoutes } from './fixtures/github.js';

const NOW = new Date('2026-10-01T19:17:00Z');
const WEATHER_PATH = '/data/2.5/weather?lat=43.6532&lon=-79.3832&units=metric&appid=SECRET';
const OW = { main: { temp: 14.4, feels_like: 13.2 }, weather: [{ id: 801, description: 'few clouds' }] };

function setup({ routes = {}, env = { OPEN_WEATHER_MAP_KEY: 'SECRET', GITHUB_TOKEN: 't' }, lastGood } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'run-'));
  const lastGoodPath = join(dir, 'cache', 'last-good.json');
  if (lastGood !== undefined) {
    mkdirSync(join(dir, 'cache'), { recursive: true });
    writeFileSync(lastGoodPath, typeof lastGood === 'string' ? lastGood : JSON.stringify(lastGood));
  }
  const warnings = [];
  const fetchImpl = fakeFetch({ [WEATHER_PATH]: OW, ...githubRoutes(), ...routes });
  const opts = {
    now: NOW,
    fetchImpl,
    env,
    outDir: join(dir, 'dist'),
    readmePath: join(dir, 'README.md'),
    lastGoodPath,
    log: { warn: m => warnings.push(m), log: () => {} },
  };
  return { dir, opts, warnings, fetchImpl };
}

const read = (dir, ...p) => readFileSync(join(dir, ...p), 'utf8');

test('happy path writes every image, README and last-good', async () => {
  const { dir, opts, warnings } = setup();
  const summary = await run(opts);
  assert.equal(summary.weatherSource, 'live');
  assert.equal(summary.githubSource, 'live');
  for (const theme of ['dark', 'light']) {
    for (const name of ['hero', 'skills', 'weather', 'stats', 'btn-site', 'btn-linkedin', 'btn-coffee']) {
      assert.ok(existsSync(join(dir, 'dist', `${name}-${theme}.svg`)), `${name}-${theme}`);
    }
    assert.ok(existsSync(join(dir, 'dist', `featured-religion-history-timeline-${theme}.svg`)));
  }
  assert.ok(read(dir, 'dist', 'stats-dark.svg').includes('updated Thu 1 Oct, 15:17 EDT'));
  assert.ok(read(dir, 'README.md').includes('### ✦ Featured'));
  const lastGood = JSON.parse(read(dir, 'dist', 'data', 'last-good.json'));
  assert.equal(lastGood.weather.data.conditionId, 801);
  assert.equal(lastGood.weather.fetchedAt, NOW.toISOString());
  assert.equal(lastGood.github.data.stats.followers, 10);
  assert.deepEqual(warnings, []);
});

test('invalid weather key (401): run stays green, card says unavailable, key never logged', async () => {
  const { dir, opts, warnings } = setup({ routes: { [WEATHER_PATH]: reply(401) } });
  const summary = await run(opts);
  assert.equal(summary.weatherSource, 'none');
  assert.ok(read(dir, 'dist', 'weather-dark.svg').includes('Toronto · weather unavailable'));
  assert.ok(read(dir, 'dist', 'hero-dark.svg').includes('id="sky"'));
  assert.equal(warnings.length, 1);
  assert.ok(warnings[0].startsWith('::warning::weather'));
  assert.ok(!warnings.join('\n').includes('SECRET'));
});

test('missing weather key: no weather request at all', async () => {
  const { opts, fetchImpl } = setup({ env: { GITHUB_TOKEN: 't' } });
  const summary = await run(opts);
  assert.equal(summary.weatherSource, 'none');
  assert.ok(!fetchImpl.calls.some(u => u.includes('openweathermap')));
});

test('weather failure uses a fallback up to 6h old', async () => {
  const fetchedAt = new Date(NOW.getTime() - 2 * 3_600_000).toISOString();
  const { dir, opts } = setup({
    routes: { [WEATHER_PATH]: reply(503) },
    lastGood: { weather: { data: { temp: -3, feelsLike: -8, conditionId: 601, description: 'snow' }, fetchedAt } },
  });
  const summary = await run(opts);
  assert.equal(summary.weatherSource, 'fallback');
  assert.ok(read(dir, 'dist', 'weather-dark.svg').includes('>-3°<'));
  assert.equal(JSON.parse(read(dir, 'dist', 'data', 'last-good.json')).weather.fetchedAt, fetchedAt);
});

test('weather fallback older than 6h is ignored', async () => {
  const fetchedAt = new Date(NOW.getTime() - 7 * 3_600_000).toISOString();
  const { opts } = setup({
    routes: { [WEATHER_PATH]: reply(503) },
    lastGood: { weather: { data: { temp: -3, feelsLike: -8, conditionId: 601, description: 'snow' }, fetchedAt } },
  });
  assert.equal((await run(opts)).weatherSource, 'none');
});

test('github failure uses any-age fallback and still writes README', async () => {
  const { dir, opts } = setup({
    routes: { '/users/petrogko': reply(500) },
    lastGood: {
      github: {
        data: { languages: [], featured: [], stats: { publicRepos: 1, stars: 0, followers: 2 }, activity: [] },
        fetchedAt: '2020-01-01T00:00:00Z',
      },
    },
  });
  const summary = await run(opts);
  assert.equal(summary.githubSource, 'fallback');
  assert.ok(read(dir, 'README.md').includes('Quiet lately'));
});

test('github failure without fallback rejects and writes nothing', async () => {
  const { dir, opts } = setup({ routes: { '/users/petrogko': reply(500) } });
  await assert.rejects(run(opts), /GitHub data unavailable/);
  assert.ok(!existsSync(join(dir, 'dist')));
  assert.ok(!existsSync(join(dir, 'README.md')));
});

test('corrupt last-good file is treated as empty', async () => {
  const { opts } = setup({ lastGood: '{"weather": {' });
  const summary = await run(opts);
  assert.equal(summary.weatherSource, 'live');
});

test('README is identical for two runs an hour apart with the same data', async () => {
  const a = setup();
  const b = setup();
  await run(a.opts);
  await run({ ...b.opts, now: new Date(NOW.getTime() + 3_600_000) });
  assert.equal(read(a.dir, 'README.md'), read(b.dir, 'README.md'));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL with `Cannot find module '…/src/index.js'`

- [ ] **Step 3: Write `src/index.js`**

```js
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { config } from './config.js';
import { formatStamp } from './time.js';
import { skyState } from './sky/index.js';
import { fetchWeather } from './sources/weather.js';
import { fetchGithub } from './sources/github.js';
import { readLastGood, freshWeather, anyGithub, writeLastGood } from './lastGood.js';
import { layoutConstellation } from './render/constellation.js';
import { renderHero } from './render/hero.js';
import {
  renderWeatherCard,
  renderStatsCard,
  renderFeaturedCard,
  renderSkills,
  renderButton,
} from './render/cards.js';
import { findXmlError } from './render/xml.js';
import { renderReadme } from './readme.js';

const THEMES = ['dark', 'light'];

export function renderFiles({ sky, weather, github, now }) {
  const { location } = config;
  const constellation = layoutConstellation(github.languages, config.toolStars);
  const files = new Map();
  for (const theme of THEMES) {
    files.set(
      `hero-${theme}.svg`,
      renderHero({
        theme,
        sky,
        weatherId: weather?.conditionId ?? null,
        constellation,
        greeting: config.greeting,
        taglines: config.taglines,
        location: location.city,
      })
    );
    files.set(`skills-${theme}.svg`, renderSkills({ theme, skills: config.skills }));
    files.set(
      `weather-${theme}.svg`,
      renderWeatherCard({ theme, weather, sky, timeZone: location.timeZone, city: location.city })
    );
    files.set(
      `stats-${theme}.svg`,
      renderStatsCard({
        theme,
        stats: github.stats,
        languages: github.languages,
        stamp: formatStamp(now, location.timeZone),
      })
    );
    for (const repo of github.featured) files.set(`featured-${repo.name}-${theme}.svg`, renderFeaturedCard({ theme, repo }));
    for (const b of config.buttons) files.set(`${b.file}-${theme}.svg`, renderButton({ theme, icon: b.icon, label: b.label }));
  }
  return files;
}

export async function run({
  now = new Date(),
  fetchImpl = globalThis.fetch,
  env = process.env,
  outDir = 'dist',
  readmePath = 'README.md',
  lastGoodPath = '.cache/last-good.json',
  log = console,
} = {}) {
  const { location } = config;
  const lastGood = readLastGood(lastGoodPath);
  const nextGood = { ...lastGood };

  const [weatherResult, githubResult] = await Promise.allSettled([
    fetchWeather({ fetch: fetchImpl, apiKey: env.OPEN_WEATHER_MAP_KEY, lat: location.lat, lon: location.lon }),
    fetchGithub({
      fetch: fetchImpl,
      token: env.GITHUB_TOKEN,
      user: config.user,
      excludeRepos: config.excludeRepos,
      featuredTopic: config.featuredTopic,
      maxFeatured: config.maxFeatured,
      activityLimit: config.activityLimit,
      timeZone: location.timeZone,
    }),
  ]);

  let weather;
  let weatherSource;
  if (weatherResult.status === 'fulfilled') {
    weather = weatherResult.value;
    weatherSource = 'live';
    nextGood.weather = { data: weather, fetchedAt: now.toISOString() };
  } else {
    log.warn(`::warning::weather source failed: ${weatherResult.reason?.message}`);
    weather = freshWeather(lastGood, now);
    weatherSource = weather ? 'fallback' : 'none';
  }

  let github;
  let githubSource;
  if (githubResult.status === 'fulfilled') {
    github = githubResult.value;
    githubSource = 'live';
    nextGood.github = { data: github, fetchedAt: now.toISOString() };
  } else {
    log.warn(`::warning::github source failed: ${githubResult.reason?.message}`);
    github = anyGithub(lastGood);
    githubSource = 'fallback';
    if (!github) throw new Error('GitHub data unavailable and no last-good fallback; refusing to publish');
  }

  const sky = skyState(now, location);
  const files = renderFiles({ sky, weather, github, now });
  for (const [name, svg] of files) {
    const problem = findXmlError(svg);
    if (problem) throw new Error(`${name} is not well-formed: ${problem}`);
  }

  mkdirSync(outDir, { recursive: true });
  for (const [name, svg] of files) writeFileSync(join(outDir, name), svg);
  writeLastGood(join(outDir, 'data', 'last-good.json'), nextGood);
  writeFileSync(
    readmePath,
    renderReadme({
      base: config.outputBase,
      featured: github.featured,
      activity: github.activity,
      links: config.links,
      skills: config.skills,
    })
  );

  return { weatherSource, githubSource, files: [...files.keys()] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({
    options: {
      out: { type: 'string', default: 'dist' },
      readme: { type: 'string', default: 'README.md' },
      'last-good': { type: 'string', default: '.cache/last-good.json' },
    },
  });
  run({ outDir: values.out, readmePath: values.readme, lastGoodPath: values['last-good'] })
    .then(s => console.log(`weather: ${s.weatherSource} · github: ${s.githubSource} · ${s.files.length} images`))
    .catch(err => {
      console.error(`::error::${err.message}`);
      process.exit(1);
    });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, all suites.

- [ ] **Step 5: Generate the real README from live public data**

Run: `GITHUB_TOKEN=$(gh auth token) node src/index.js --out dist`
Expected:
- The output reads `weather: none · github: live · N images`, plus one `::warning::weather source failed: OPEN_WEATHER_MAP_KEY is not set`. The key only exists as a repo secret.
- `README.md` is rewritten and `dist/` is populated.
- Check `git diff --stat README.md` to see the change, and `open dist/hero-dark.svg dist/stats-dark.svg` to look at the images.

- [ ] **Step 6: Commit**

```bash
git add src/index.js test/index.test.js README.md
git -c user.name='Petro G' -c user.email='petro.gko@gmail.com' commit -m "feat: orchestrate sources, fallbacks, rendering and README output" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Preview gallery

**Files:**
- Create: `scripts/preview.js`, `test/preview.test.js`

**Interfaces:**
- Consumes:
  - `renderHero` (Task 5); every card renderer (Task 6)
  - `layoutConstellation` (Task 4); `config`; `SAMPLE`
- Produces:
  - `previewEntries() → { group: string, name: string, theme: 'dark' | 'light', svg: string }[]`
  - CLI `node scripts/preview.js` writes `preview/<name>.svg` and `preview/index.html`

- [ ] **Step 1: Write the failing test `test/preview.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { previewEntries } from '../scripts/preview.js';
import { findXmlError } from '../src/render/xml.js';

test('preview covers every phase × weather, holidays, both themes and all cards', () => {
  const entries = previewEntries();
  const names = new Set(entries.map(e => e.name));
  assert.equal(names.size, entries.length, 'names are unique');
  for (const phase of ['dawn', 'day', 'dusk', 'night']) {
    for (const w of ['none', 'clear', 'light-clouds', 'dense-clouds', 'rain', 'snow']) {
      assert.ok(names.has(`hero-${phase}-${w}`), `${phase}-${w}`);
    }
    assert.ok(names.has(`hero-${phase}-light-theme`), `${phase} light`);
  }
  for (const h of ['halloween', 'newyear', 'canadaday', 'autumn']) assert.ok(names.has(`hero-${h}`), h);
  for (const theme of ['dark', 'light']) {
    for (const c of ['weather', 'weather-unavailable', 'stats', 'featured', 'skills', 'button']) {
      assert.ok(names.has(`card-${c}-${theme}`), `${c}-${theme}`);
    }
  }
  for (const e of entries) assert.equal(findXmlError(e.svg), null, e.name);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL with `Cannot find module '…/scripts/preview.js'`

- [ ] **Step 3: Write `scripts/preview.js`**

```js
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { config } from '../src/config.js';
import { layoutConstellation } from '../src/render/constellation.js';
import { renderHero } from '../src/render/hero.js';
import {
  renderWeatherCard,
  renderStatsCard,
  renderFeaturedCard,
  renderSkills,
  renderButton,
} from '../src/render/cards.js';
import { SAMPLE } from './sample-data.js';

const PHASES = ['dawn', 'day', 'dusk', 'night'];
const WEATHER = { none: null, clear: 800, 'light-clouds': 801, 'dense-clouds': 804, rain: 501, snow: 601 };
const TZ = config.location.timeZone;

export function previewEntries() {
  const constellation = layoutConstellation(SAMPLE.github.languages, config.toolStars);
  const hero = (theme, sky, weatherId) =>
    renderHero({
      theme,
      sky: { ...SAMPLE.sky, ...sky },
      weatherId,
      constellation,
      greeting: config.greeting,
      taglines: config.taglines,
      location: config.location.city,
    });
  const entries = [];
  for (const phase of PHASES) {
    for (const [w, id] of Object.entries(WEATHER)) {
      entries.push({ group: 'Sky × weather (dark)', name: `hero-${phase}-${w}`, theme: 'dark', svg: hero('dark', { phase }, id) });
    }
    entries.push({ group: 'Sky (light theme)', name: `hero-${phase}-light-theme`, theme: 'light', svg: hero('light', { phase }, 800) });
  }
  entries.push(
    { group: 'Seasons and holidays', name: 'hero-halloween', theme: 'dark', svg: hero('dark', { phase: 'dusk', season: 'autumn', holiday: 'halloween' }, 800) },
    { group: 'Seasons and holidays', name: 'hero-newyear', theme: 'dark', svg: hero('dark', { phase: 'night', season: 'winter', holiday: 'newyear' }, 800) },
    { group: 'Seasons and holidays', name: 'hero-canadaday', theme: 'dark', svg: hero('dark', { phase: 'night', season: 'summer', holiday: 'canadaday' }, 800) },
    { group: 'Seasons and holidays', name: 'hero-autumn', theme: 'dark', svg: hero('dark', { phase: 'day', season: 'autumn' }, 801) }
  );
  for (const theme of ['dark', 'light']) {
    const group = `Cards (${theme})`;
    entries.push(
      { group, theme, name: `card-weather-${theme}`, svg: renderWeatherCard({ theme, weather: SAMPLE.weather, sky: SAMPLE.sky, timeZone: TZ, city: 'Toronto' }) },
      { group, theme, name: `card-weather-unavailable-${theme}`, svg: renderWeatherCard({ theme, weather: null, sky: SAMPLE.sky, timeZone: TZ, city: 'Toronto' }) },
      { group, theme, name: `card-stats-${theme}`, svg: renderStatsCard({ theme, stats: SAMPLE.github.stats, languages: SAMPLE.github.languages, stamp: 'Thu 1 Oct, 15:17 EDT' }) },
      { group, theme, name: `card-featured-${theme}`, svg: renderFeaturedCard({ theme, repo: SAMPLE.github.featured[0] }) },
      { group, theme, name: `card-skills-${theme}`, svg: renderSkills({ theme, skills: config.skills }) },
      { group, theme, name: `card-button-${theme}`, svg: renderButton({ theme, icon: '🌐', label: 'petrogko.com' }) }
    );
  }
  return entries;
}

function galleryHtml(entries) {
  const groups = [...new Set(entries.map(e => e.group))];
  const sections = groups
    .map(group => {
      const items = entries.filter(e => e.group === group);
      const bg = items[0].theme === 'light' ? '#ffffff' : '#0d1117';
      const fg = items[0].theme === 'light' ? '#1b2550' : '#c9d1d9';
      const figures = items
        .map(e => `<figure><img src="${e.name}.svg" alt="${e.name}"><figcaption>${e.name}</figcaption></figure>`)
        .join('\n');
      return `<section style="background:${bg};color:${fg}"><h2>${group}</h2><div class="grid">${figures}</div></section>`;
    })
    .join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Profile preview</title>
<style>body{margin:0;font-family:system-ui,sans-serif}section{padding:24px 16px}h2{margin:0 0 16px;font-size:18px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:16px}figure{margin:0}img{width:100%;height:auto;display:block}figcaption{font:12px ui-monospace,monospace;opacity:.7;margin-top:4px}</style>
</head><body>${sections}</body></html>\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = 'preview';
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const entries = previewEntries();
  for (const e of entries) writeFileSync(join(out, `${e.name}.svg`), e.svg);
  writeFileSync(join(out, 'index.html'), galleryHtml(entries));
  console.log(`wrote ${entries.length} previews to ${out}/index.html`);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Generate and open the gallery**

Run: `npm run preview && open preview/index.html`
Expected: the gallery shows every sky, holiday and card. Look for overlapping labels, clipped text and unreadable contrast, especially the day-phase constellation labels and the Canada Day leaf position. Fix any problems in the renderers and refresh snapshots with `UPDATE_SNAPSHOTS=1 npm test`.

- [ ] **Step 6: Commit**

```bash
git add scripts/preview.js test/preview.test.js
git -c user.name='Petro G' -c user.email='petro.gko@gmail.com' commit -m "feat: add preview gallery of every sky, holiday and card variant" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Hourly workflow

**Files:**
- Delete: `.github/workflows/main.yaml`
- Create: `.github/workflows/build.yaml`

**Interfaces:**
- Consumes:
  - CLI `node src/index.js --out dist` (Task 10), `node scripts/preview.js` (Task 11)
  - Secrets `OPEN_WEATHER_MAP_KEY` (exists since 2021) and `GITHUB_TOKEN`
- Produces:
  - Branch `output`, holding `*.svg` and `data/last-good.json`
  - README commits on `main`

- [ ] **Step 1: Replace the workflow**

```bash
git rm -q .github/workflows/main.yaml
```

Create `.github/workflows/build.yaml`:

```yaml
name: Profile build

on:
  schedule:
    - cron: '17 * * * *'
  workflow_dispatch:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'templates/**'
      - 'scripts/**'
      - 'package.json'
      - 'package-lock.json'
      - '.github/workflows/build.yaml'
  pull_request:

permissions:
  contents: write
  actions: write

concurrency:
  group: profile-build
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Checkout
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1

      - name: Set up Node
        uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version: 24
          cache: npm

      - name: Install
        run: npm ci

      - name: Test
        run: npm test

      - name: Load last good data
        run: |
          mkdir -p .cache
          if git fetch --depth=1 origin output 2>/dev/null; then
            git show FETCH_HEAD:data/last-good.json > .cache/last-good.json 2>/dev/null || echo "no last-good.json on output yet"
          else
            echo "output branch does not exist yet"
          fi

      - name: Render
        run: node src/index.js --out dist
        env:
          OPEN_WEATHER_MAP_KEY: ${{ secrets.OPEN_WEATHER_MAP_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Contribution snake
        uses: Platane/snk/svg-only@d8f6715049803e982ee5ff501b6b9b7d5deeb09b # v3.5.0
        with:
          github_user_name: petrogko
          outputs: |
            dist/snake-dark.svg?palette=github-dark&color_snake=#a8c4ff&color_dots=#161b33,#3b2a7a,#6e40c9,#1f6feb,#2ea4a4
            dist/snake-light.svg?color_snake=#6e40c9&color_dots=#eef1fb,#c9c1ef,#9b84e0,#5b8def,#2ea4a4

      - name: Preview gallery
        if: github.event_name == 'pull_request'
        run: node scripts/preview.js

      - name: Upload preview
        if: github.event_name == 'pull_request'
        uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
        with:
          name: profile-preview
          path: |
            dist/
            preview/
            README.md

      - name: Publish images to output branch
        if: github.event_name != 'pull_request'
        working-directory: dist
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          git init -q -b output
          git config user.name 'github-actions[bot]'
          git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
          git add -A
          git commit -q -m "Render $(date -u +%Y-%m-%dT%H:%MZ)"
          git push -q --force "https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git" HEAD:output

      - name: Commit README if changed
        if: github.event_name != 'pull_request'
        run: |
          if git diff --quiet -- README.md; then
            echo "README unchanged"
            exit 0
          fi
          git config user.name 'github-actions[bot]'
          git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
          git add README.md
          git commit -q -m "chore(readme): refresh activity"
          git push -q origin HEAD:main

      - name: Keep schedule alive
        if: github.event_name != 'pull_request'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: gh api -X PUT "repos/${GITHUB_REPOSITORY}/actions/workflows/build.yaml/enable"
```

- [ ] **Step 2: Validate the YAML and the pins**

Run:
```bash
ruby -ryaml -e 'w = YAML.load_file(".github/workflows/build.yaml"); puts w["jobs"]["build"]["steps"].map { |s| s["name"] }.join(" | ")'
grep -nE 'uses: [^ ]+@' .github/workflows/build.yaml | grep -vE '@[0-9a-f]{40} # v' && echo "UNPINNED ACTION FOUND" || echo "all actions pinned"
```
Expected:
- First command: the 12 step names, separated by ` | `.
- Second command: `all actions pinned`.

- [ ] **Step 3: Run the full suite one more time**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/build.yaml
git -c user.name='Petro G' -c user.email='petro.gko@gmail.com' commit -m "ci: hourly pinned workflow publishing to an output branch" -m "Replaces the disabled README build workflow (actions v1, Node 13, unpinned third-party publisher). Images force-push to output; README commits only when its text changes; the workflow re-enables itself every run." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Go live (each outward step needs Petro's explicit OK)

**Files:** none. Everything here happens on GitHub.

- [ ] **Step 1: Ask Petro to approve pushing the branch and opening a PR**, then:

```bash
git push -u origin living-sky
gh pr create --base main --head living-sky --title "Living sky profile README" --body "$(cat <<'EOF'
Rebuilds the profile README. Spec: docs/superpowers/specs/2026-10-01-living-sky-profile-design.md

- Living Toronto sky hero (time of day, weather, moon, seasons, holidays), real-data constellation, auto-featured projects, live weather/stats/activity, contribution snake
- Hourly pinned workflow; images publish to `output`, README commits only when its text changes
- Removes Puppeteer scraping, the hardcoded open proxy, the unpinned publish action, and the broken glitch.me/workflow badges

The PR run uploads a `profile-preview` artifact containing every variant.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: Wait for the PR check, then fetch and review the preview artifact**

```bash
gh pr checks --watch
gh run download --name profile-preview --dir /private/tmp/claude-501/-Users-petrog-Development-github-petrogko/8d9b09d0-4578-47fd-a489-b23b2b026a0c/scratchpad/pr-preview
open /private/tmp/claude-501/-Users-petrog-Development-github-petrogko/8d9b09d0-4578-47fd-a489-b23b2b026a0c/scratchpad/pr-preview/preview/index.html
```

Expected:
- The check is green and the gallery opens.
- The run log shows `weather: live` if the 2021 key still works, or a `::warning::weather source failed: HTTP 401` line if it doesn't.
- With a 401, ask Petro to create a new key at openweathermap.org and run `! gh secret set OPEN_WEATHER_MAP_KEY` himself.

- [ ] **Step 3: Ask Petro to approve tagging the two timeline repos as featured**, then:

```bash
gh repo edit petrogko/religion-history-timeline --add-topic featured
gh repo edit petrogko/politics-history-timeline --add-topic featured
```

- [ ] **Step 4: Ask Petro to approve the merge**, then:

```bash
gh pr merge --merge --delete-branch
gh workflow run build.yaml --ref main
gh run watch "$(gh run list --workflow build.yaml --limit 1 --json databaseId --jq '.[0].databaseId')"
```

Expected: the run is green, and the `output` branch exists.

- [ ] **Step 5: Verify the live profile**

```bash
for f in hero-dark hero-light weather-dark stats-dark snake-dark featured-religion-history-timeline-dark btn-site-dark; do
  printf "%s: " "$f"; curl -s -o /dev/null -w "%{http_code}\n" "https://raw.githubusercontent.com/petrogko/petrogko/output/$f.svg"
done
gh workflow list --all | grep 'Profile build'
```

Expected:
- Every line prints `200`.
- The workflow shows `active`.
- Open https://github.com/petrogko in both the light and dark GitHub themes and confirm there are no broken images.

- [ ] **Step 6: Note the 7-day check**

On or after 2026-10-08, check:
- `gh run list --workflow build.yaml --limit 50` is all green.
- `git log origin/main --since=2026-10-01 --author='github-actions'` only shows `chore(readme): refresh activity` commits.
- `gh workflow list --all` still shows `active`.
