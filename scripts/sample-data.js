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
