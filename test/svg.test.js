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
