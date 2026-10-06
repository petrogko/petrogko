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
