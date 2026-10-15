# Living Sky profile README: design

**Date:** 2026-10-01
**Repo:** `petrogko/petrogko` (GitHub profile README)
**Status:** awaiting approval

## 1. Context

This repo builds the README that appears on github.com/petrogko. It was last updated on 2025-03-03, and the profile is broken:

- The `README build` workflow is `disabled_inactivity`. It was most likely failing after GitHub retired `actions/cache@v1` on 2025-03-01; with no commits after that, GitHub disabled the schedule after 60 days.
- The Instagram scraper (Puppeteer → picuki.com) now gets HTTP 403. Its catch block calls `process.exit()`, which exits with code 0, so a failed run looks successful and leaves the README untouched. Its images (`img1`–`img3`) were never used in the template anyway.
- Visitors see two broken images. The glitch.me visitor badge returns 410 and the old-format workflow badge returns 404.
- The README still says "-6°C, overcast clouds" next to "generated every 3 hours".
- Other problems: an open proxy (`194.67.37.90:3128`) hardcoded in the Chromium flags, the third-party publish action used unpinned (`@master`) with a write token, Node 13, `actions/*@v1`, an `<embed>` React badge that GitHub strips and that carries the Vue logo, typos, malformed HTML, and about 11k bot commits (99.7% of history).

## 2. Goals

1. **A balanced profile.** The first screen is professional and easy to skim: who Petro is, what he builds, his best work. The live and playful elements come below.
2. **A living sky hero.** The banner shows Toronto's real sky: time of day, live weather, moon phase, seasonal and holiday touches.
3. **Reliability.** No hotlinked hobby services, and one failed data source never blanks or breaks the page. The schedule cannot be disabled by inactivity again.
4. **Quiet history.** Bot commits on `main` happen only when the README text actually changes.
5. **Security.** All actions pinned to exact commits, least-privilege permissions, no scraping, no proxies.

## 3. Non-goals

- Visitor counters (they all depend on someone else's server).
- Spotify or "now playing" (needs an OAuth app and refresh-token secret; removed before).
- Third-party stats-card services (we render our own).
- Rewriting the existing 11k bot commits (would need a force-push to `main` on a public repo).
- Language stats from private repos. The decision is **public repos only** and no new secrets.

## 4. Decisions log

| Topic | Decision |
|---|---|
| Audience | Balanced mix: a professional first screen, then the fun live content |
| Bio copy | Drafted from recent repos; Petro edits it during spec review (§6.2) |
| Visual direction | Hybrid "Aurora constellation": C's night sky and skill constellation plus B's aurora gradient, wave edge, pills and glass cards |
| Day theme | The hero follows Toronto's real time of day (dawn, day, dusk, night) with weather layers and the moon phase |
| Extras | All four: real-data constellation, auto-featured projects, rotating tagline, seasonal and holiday touches |
| Publishing | Option C, hybrid: images force-pushed to an `output` branch every run; `README.md` committed to `main` only when its text changes |
| Language data | Public non-fork repos only; tool stars (Docker, K8s, AWS, LLMs) come from config |
| Stack | Node 24 LTS (ESM), built-in `fetch` and `node:test`; runtime dependencies are only `mustache` and `suncalc` |
| Cadence | **Hourly**, at minute :17. This refines the "every 3h" from brainstorming: with a 3h cadence the dusk/dawn image would often stay up for hours after the real event. Actions minutes are free for public repos, OpenWeather allows 1,000 calls a day (we use 24), and `main` still only changes when the text changes. |

## 5. Visual design

### 5.1 Palette (aurora)
- Night sky: `#1b2550 → #0b1026 → #05070f` (radial)
- Aurora: `#6e40c9` (violet), `#1f6feb` (blue), `#2ea4a4` (teal)
- Star and line colour `#e3ecff` / `#a8c4ff`; muted text `#8b9bd0`; card border `#2a3560`
- Page background behind the wave edge: `#0d1117` (dark) and `#ffffff` (light). This is the **only** difference between a hero's dark and light variants.
- Cards in the light theme: white to `#f6f8ff` glass gradient, `#d0d7f0` border, `#1b2550` text.

### 5.2 Hero (`hero-{dark,light}.svg`, 800×260)

Layers, back to front:

1. **Sky gradient by phase.** Phase is computed from `suncalc` sun times for Toronto (43.6532, −79.3832), comparing instants:

   | Phase | Window | Look |
   |---|---|---|
   | dawn | sunrise − 60 min ≤ t < sunrise + 60 min | indigo → violet → peach, fading stars, sun on the horizon at right |
   | day | sunrise + 60 min ≤ t < sunset − 60 min | blue gradient, sun disc with glow at top right |
   | dusk | sunset − 60 min ≤ t < sunset + 60 min | indigo → magenta → orange, sun on the horizon at left, first stars |
   | night | otherwise | aurora sky (Aurora mockup) with an animated aurora band |

2. **Moon** (night only). Drawn from `suncalc.getMoonIllumination(now).phase` (0 to 1) as a disc plus a terminator path. Hidden at new moon (illumination < 3%).

3. **Weather layer.** Mapped from the OpenWeather condition id:

   | id | Layer |
   |---|---|
   | 800 | none |
   | 801–802 | light cloud layer (2 clouds, drifting) |
   | 803–804, 7xx | dense cloud layer (4 clouds, greyer) |
   | 2xx, 3xx, 5xx | rain streaks plus a dense cloud band at the top |
   | 6xx | snowflakes falling slowly |
   | missing or unavailable | none |

4. **Seasonal and holiday layer.** Uses the Toronto local date.
   - **Autumn** (Sep–Nov): 5 maple leaves drifting down. Skipped when the weather layer is rain or snow.
   - **Halloween** (Oct 31): the moon turns orange (`#ff9a3c`) and is drawn even at day/dusk as a faint disc.
   - **New Year** (Dec 31 – Jan 1): 3 looping firework bursts in aurora colours.
   - **Canada Day** (Jul 1): aurora stops become `#d52b1e` / `#ffffff`, and a small maple leaf sits after the name.
   - Holidays take precedence over the season layer.

5. **Constellation** (right half). See §5.3. In day phase the lines are dashed (`3 4`) and the stars don't twinkle.

6. **Text.** "Hi, I'm Petro 👋" (40px, bold, system sans stack). Beneath it a rotating tagline followed by the static " · Toronto". Tagline lines come from config: *Solutions & DevOps Engineer → Homelab tinkerer → AI app builder → Star-chart maker*, 3s each, cross-fading on a 12s CSS cycle. With reduced motion only the first line shows. Text colour is white, except in day phase (`#0b1f3a` / `#173a6a`).

7. **Wave edge** at the bottom, filled with the page background (§5.1).

**Animation rules:**
- CSS keyframes only, no SMIL, so a single rule can stop everything: `@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }`.
- No external fonts or images. Everything is inline.

### 5.3 Constellation (real data)
- **Language stars:** the top 6 languages by bytes across all public non-fork repos owned by `petrogko`, excluding `config.excludeRepos` (empty by default). Radius `2.5 + 5 * sqrt(share)`. Label is the language name in lower case, monospace, 11px.
- **Tool stars:** `config.toolStars` (`docker`, `kubernetes`, `aws`, `llms`). Fixed radius 2.2 with a hollow ring style.
- **Layout:** 10 fixed slots in the hero's right half (x 470–760, y 40–210). Language stars take slots 1–6 in rank order and tool stars slots 7–10. Lines join the slots in a fixed path. Identical input always produces identical output.
- With fewer than 6 languages, the unused language slots stay empty and their lines are dropped. With no language data (source failed and no fallback), only the tool stars render, in slots 7–10.

### 5.4 Cards (each `-dark` and `-light`, 400×140 unless noted)
- **Weather card:** label "TORONTO NOW", temperature (rounded °C), condition (sentence case), "feels like N°", sunrise ☀︎ and sunset ☾ times from `suncalc` formatted `HH:mm` in America/Toronto, and a small glyph matching the weather layer. Unavailable state: "Toronto · weather unavailable", with sun times still shown.
- **Stats card:** public repos, total stars on public repos, followers; a stacked bar of the top 4 languages with names; a footer "updated Thu 1 Oct, 15:17 EDT". This footer is the only "last updated" stamp on the page.
- **Featured card** (one per repo): constellation art seeded from a hash of the repo name (hue and star positions); humanised title (`religion-history-timeline` → "Religion History Timeline"); description word-wrapped to at most 3 lines of about 52 characters, with an ellipsis if longer.
- **Skills strip** (`skills-*.svg`, 800×36, one row): pills from `config.skills`, which lists Python, TypeScript, Go, Docker, Kubernetes, AWS, Linux and LLMs, each with an emoji.
- **Connect buttons** (`btn-site-*`, `btn-linkedin-*`, `btn-coffee-*`, 180×36): 🌐 petrogko.com · 💼 LinkedIn · ☕ Buy me a coffee.

## 6. Page

### 6.1 Order
1. Hero, then the skills strip
2. About (static text)
3. ✦ Featured (cards side by side, `width="49%"`, each linked to the repo homepage or its GitHub page)
4. ✦ Live from Toronto: weather and stats cards side by side, then "Recent activity" (Markdown list, up to 5 items)
5. Contribution snake (`snake-{dark,light}.svg` from Platane/snk, aurora colours)
6. Connect buttons, then a one-line footer: "✦ This README updates itself every hour ✦"

Every image is a `<picture>` element: `<source media="(prefers-color-scheme: dark)" srcset="…-dark.svg">` plus `<img src="…-light.svg" alt="…">`. URLs have the form `https://raw.githubusercontent.com/petrogko/petrogko/output/<file>`.

**Invariant: `README.md` contains no value that changes from run to run.** All alt text is static, there are no timestamps, and activity dates are absolute ("Oct 1"). Only these can change it: the activity feed, the list of featured repos, and template edits.

### 6.2 Copy (draft for Petro to edit)
> I'm a Solutions & DevOps engineer in Toronto. My day job is keeping infrastructure reliable. In my own time I build things on top of it: AI-powered apps, a self-hosted homelab, security tooling, and interactive data visualizations.
>
> 🤖 Building small AI apps with LLMs
> 🏠 Running and automating a homelab
> 🔐 Writing security scripts and tooling
> ✨ Charting history as interactive star maps

Private projects are described only in general terms. No private repo names appear anywhere.

### 6.3 Activity feed
Source: `GET /users/petrogko/events/public?per_page=30`. Mapping:

| Event | Line |
|---|---|
| PushEvent | 🚀 Pushed to **repo** |
| PullRequestEvent `opened` | 🔀 Opened a pull request in **repo** |
| PullRequestEvent `closed` + merged | ✅ Merged a pull request in **repo** |
| CreateEvent `repository` | ✨ Created **repo** |
| ReleaseEvent `published` | 🏷️ Released **tag** of **repo** |
| IssuesEvent `opened` | 🐛 Opened an issue in **repo** |
| WatchEvent | ⭐ Starred **owner/repo** |
| ForkEvent | 🍴 Forked **owner/repo** |
| anything else | ignored |

- `repo` drops the `petrogko/` prefix for own repos.
- Lines with the same (line text, Toronto date) are collapsed.
- Keep the newest 5. Each links to `https://github.com/<full name>`.
- Dates are `MMM d` in America/Toronto.
- An empty list renders "_Quiet lately. See what I'm building at [petrogko.com](https://petrogko.com)._"

## 7. Architecture

```
src/
  index.js              orchestrator: load last-good → gather → sky → render → write
  config.js             username, location, timezone, skills, toolStars, taglines, palette, excludeRepos
  sources/weather.js    OpenWeather current weather → { temp, feelsLike, conditionId, description }
  sources/github.js     repos, languages, featured (topic `featured`), followers, stars, events
  sky/phase.js          (now, sunTimes) → 'dawn' | 'day' | 'dusk' | 'night'
  sky/moon.js           now → { phase, illumination, visible }
  sky/season.js         now (Toronto date) → { season, holiday }
  render/svg.js         escapeXml, wrapText, palette per theme, reducedMotion style, hash → seeded rand
  render/hero.js        (skyState, weather, constellation, taglines, theme) → SVG string
  render/constellation.js  (languages, toolStars) → [{ slot, x, y, r, label, kind }]
  render/cards.js       weatherCard, statsCard, featuredCard, skillsStrip, button → SVG string
  readme.js             (featured, activity) → README.md string via templates/README.mustache
  lastGood.js           read/write last-good.json, freshness rules
templates/README.mustache
test/                   unit and snapshot tests, fixtures/*.json
scripts/preview.js      writes every variant plus a gallery to preview/
```

- **`sky/*` and `render/*` are pure.** They make no I/O and take `now` as an argument.
- **`sources/*` are the only modules that touch the network,** and they take `fetch` as an injectable parameter so tests can use fixtures.
- **`index.js` is the only place where errors are turned into fallbacks.**

## 8. Data flow and workflow

`.github/workflows/build.yaml` replaces `main.yaml`.

- **Triggers:**
  - `schedule: '17 * * * *'`
  - `workflow_dispatch`
  - `push` to `main` (paths `src/**`, `templates/**`, `scripts/**`, `package*.json`, the workflow file)
  - `pull_request` (preview only)
- **Permissions:** `contents: write`, `actions: write`. Concurrency group `profile-build`, no cancel. `timeout-minutes: 10`.
- **Every `uses:` is pinned to a full commit SHA,** with the version in a comment.

**Steps:**
1. Checkout, set up Node 24 (npm cache), `npm ci`, `npm test`.
2. Fetch fallback data: `git fetch origin output --depth=1`, then `git show FETCH_HEAD:data/last-good.json > .cache/last-good.json`. Both are allowed to fail on the first run.
3. `node src/index.js --out dist`, with env `OPEN_WEATHER_MAP_KEY` and `GITHUB_TOKEN`. It writes `dist/*.svg`, `dist/data/last-good.json` and `README.md`.
4. `Platane/snk/svg-only` writes `dist/snake-dark.svg` and `dist/snake-light.svg` with aurora `color_snake` / `color_dots`.
5. **Pull request:** run `node scripts/preview.js`, upload `dist/` and `preview/` as an artifact, then stop.
6. **Publish images:** in `dist/`, `git init` → commit as `github-actions[bot]` → `git push --force origin HEAD:output`.
7. **Publish README:** if `git diff --quiet README.md` reports a change, commit `chore(readme): refresh activity` and push to `main`. Pushes made with `GITHUB_TOKEN` don't trigger new runs.
8. **Keepalive:** `gh api -X PUT repos/$GITHUB_REPOSITORY/actions/workflows/build.yaml/enable`.

## 9. Error handling

| Situation | Behaviour |
|---|---|
| Source request fails or times out | 10s timeout (`AbortSignal.timeout`), 1 retry. Then use last-good data and emit a `::warning::`. The run stays green. |
| Weather fallback older than 6h | Not used: render the "unavailable" state. |
| GitHub fallback (any age) | Used (the data changes slowly). |
| No weather fallback | Weather card shows "unavailable"; the sky still renders from local calculations. The run stays green. |
| No GitHub data and no fallback | The run **fails** (exit 1) and nothing is published. Publishing without GitHub data would drop the featured-card images that the unchanged README still links to. This needs both the GitHub API and `last-good.json` to be unavailable at once. |
| `OPEN_WEATHER_MAP_KEY` unset | Same as a failed weather source, without a retry. |
| Rendering throws, or an SVG isn't well-formed XML (checked before writing) | The run **fails**: exit 1, nothing published, the last good images stay live. |
| Untrusted text (descriptions, event payloads, repo names) | Always passed through `escapeXml` for SVG; Mustache `{{ }}` escaping for the README. |

`last-good.json` is `{ weather: { data, fetchedAt }, github: { data, fetchedAt } }`. Only data that was fetched successfully overwrites an entry.

## 10. Testing

`node:test`, with no network access in tests.

- **`sky/phase`:**
  - each boundary ±1 minute around sunrise and sunset
  - a summer day and a winter day
- **`sky/season`:**
  - Oct 31, Dec 31, Jan 1 and Jul 1 (Toronto date, including UTC-midnight edge cases)
  - one date per season
- **`sky/moon`:** new and full moon dates with known values.
- **`render/constellation`:**
  - deterministic output
  - rank → slot mapping
  - radius scaling
  - 0 languages, and more than 6 languages
- **`sources/github`:**
  - events mapping and deduplication
  - date formatting
  - prefix stripping
  - fork and private filtering (fixture JSON)
- **`render/svg`:** escaping (`<`, `&`, quotes) and word wrapping.
- **Snapshot tests:**
  - the hero for every phase × weather combination (clear, light clouds, dense clouds, rain, snow, none)
  - every holiday
  - every card in both themes
  - Snapshots live in `test/__snapshots__/`; `UPDATE_SNAPSHOTS=1 npm test` rewrites them.
- **Well-formedness check:** every generated SVG is parsed by a small XML checker inside the tests.
- **`npm run preview`:** writes `preview/index.html`, a gallery of every variant in both themes.

## 11. One-time setup and cleanup

**Delete:**
- `index.js`, `services/`, `main.mustache`, `README.md.bak`, `images/code.gif`, `images/dev-working.gif`
- `.github/workflows/main.yaml`
- the Puppeteer, node-fetch and dotenv dependencies

**Update:**
- `package.json`: name and description, `"license": "MIT"` (matching `LICENSE`), `"type": "module"`, `engines.node >= 24`, scripts `build`, `test`, `preview`.
- `.gitignore`: add `.superpowers/`, `dist/`, `preview/`, `.cache/`.

**Ask Petro first** before adding the `featured` topic to `religion-history-timeline` and `politics-history-timeline`. It is an outward-facing change.

**After the first merge:**
- Enable `build.yaml` and run it once by hand.
- Verify the OpenWeather key from 2021 still works. If not, Petro creates a new key and runs `gh secret set OPEN_WEATHER_MAP_KEY`.

## 12. Risks

| Risk | Mitigation |
|---|---|
| Unclear whether force-pushes to `output` count as "repository activity" for the 60-day rule | The keepalive API call runs every hour regardless. Check the workflow state after a week. |
| GitHub's image proxy (camo) caches images, so updates can lag a few minutes | Acceptable. The same pattern is used by the snake action. |
| Emoji in SVG text depend on the viewer's OS fonts | Used only for decoration; text still reads without them. |
| Public-only language data reflects older sample repos | Accepted. It shifts as Petro publishes more; `excludeRepos` exists if needed. |

## 13. Success criteria

1. The profile shows no broken images in GitHub's dark or light theme.
2. The scheduled workflow is green for 7 consecutive days. During that time `main` only gets bot commits when the activity or featured text changes.
3. The hero phase matches the real Toronto sky within an hour. Weather layers match conditions.
4. With the weather key removed, the run is still green, the weather card shows "unavailable", and the sky is still right.
5. `npm test` passes, and the preview gallery shows every phase, weather, holiday and theme combination.
