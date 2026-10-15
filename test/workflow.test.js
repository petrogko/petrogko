import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const yaml = readFileSync(new URL('../.github/workflows/build.yaml', import.meta.url), 'utf8');
const steps = Object.fromEntries(
  yaml
    .split(/\n {6}- name: /)
    .slice(1)
    .map(block => [block.split('\n')[0].trim(), block])
);

test('publishing steps only run for main, never for branch dispatches', () => {
  for (const name of ['Publish images to output branch', 'Commit README if changed', 'Keep schedule alive']) {
    assert.ok(steps[name], `missing step ${name}`);
    assert.match(steps[name], /if: .*github\.ref == 'refs\/heads\/main'/, name);
  }
});

test('README commit rebases onto the current main before diffing', () => {
  const step = steps['Commit README if changed'];
  const fetchAt = step.indexOf('git fetch -q --depth=1 origin main');
  const resetAt = step.indexOf('git reset -q --hard FETCH_HEAD');
  const diffAt = step.indexOf('git diff --quiet -- README.md');
  assert.ok(fetchAt > -1 && resetAt > fetchAt && diffAt > resetAt, 'fetch → reset → diff order');
  assert.ok(step.indexOf('$RUNNER_TEMP/README.md') > -1 && step.indexOf('$RUNNER_TEMP/README.md') < resetAt);
});
