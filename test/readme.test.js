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
