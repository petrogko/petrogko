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
