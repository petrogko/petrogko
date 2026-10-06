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
