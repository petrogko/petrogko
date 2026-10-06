import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutConstellation, SLOTS } from '../src/render/constellation.js';

const TOOLS = ['docker', 'kubernetes', 'aws', 'llms'];

test('is deterministic', () => {
  const langs = [
    { name: 'HTML', bytes: 459 },
    { name: 'JavaScript', bytes: 435 },
  ];
  assert.deepEqual(layoutConstellation(langs, TOOLS), layoutConstellation(langs, TOOLS));
});

test('ranks languages by bytes into slots 0..5 (ties by name), tools into 6..9', () => {
  const { stars } = layoutConstellation(
    [
      { name: 'PHP', bytes: 71 },
      { name: 'HTML', bytes: 459 },
      { name: 'Go', bytes: 13 },
      { name: 'CSS', bytes: 13 },
    ],
    TOOLS
  );
  assert.deepEqual(
    stars.map(s => [s.slot, s.label, s.kind]),
    [
      [0, 'html', 'language'],
      [1, 'php', 'language'],
      [2, 'css', 'language'],
      [3, 'go', 'language'],
      [6, 'docker', 'tool'],
      [7, 'kubernetes', 'tool'],
      [8, 'aws', 'tool'],
      [9, 'llms', 'tool'],
    ]
  );
  assert.deepEqual({ x: stars[0].x, y: stars[0].y }, SLOTS[0]);
});

test('radius is 2.5 + 5*sqrt(share of all bytes); tools are 2.2', () => {
  const { stars } = layoutConstellation(
    [
      { name: 'A', bytes: 75 },
      { name: 'B', bytes: 25 },
    ],
    ['docker']
  );
  assert.equal(stars[0].r, 6.8); // 2.5 + 5*sqrt(0.75) = 6.83
  assert.equal(stars[1].r, 5); // 2.5 + 5*sqrt(0.25)
  assert.equal(stars[2].r, 2.2);
});

test('caps at six languages but uses all bytes for shares', () => {
  const langs = Array.from({ length: 8 }, (_, i) => ({ name: `L${i}`, bytes: 100 }));
  const { stars } = layoutConstellation(langs, []);
  assert.equal(stars.length, 6);
  assert.equal(stars[0].r, 4.3); // 2.5 + 5*sqrt(1/8) = 4.27
});

test('edges only connect occupied slots', () => {
  const none = layoutConstellation([], TOOLS);
  assert.deepEqual(none.stars.map(s => s.slot), [6, 7, 8, 9]);
  assert.deepEqual(none.edges, []);
  const two = layoutConstellation(
    [
      { name: 'A', bytes: 2 },
      { name: 'B', bytes: 1 },
    ],
    []
  );
  assert.deepEqual(two.edges, [[0, 1]]);
});
