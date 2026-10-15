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
