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
