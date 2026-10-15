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
