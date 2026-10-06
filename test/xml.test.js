import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findXmlError } from '../src/render/xml.js';

test('accepts well-formed SVG', () => {
  assert.equal(findXmlError('<svg><g a="1"/><text>x &amp; y</text></svg>'), null);
  assert.equal(findXmlError('<?xml version="1.0"?><!-- <oops> --><svg/>'), null);
  assert.equal(findXmlError('<svg><style>.a { b: c; } * { d: e !important; }</style></svg>'), null);
});

test('rejects structural problems', () => {
  assert.match(findXmlError('<svg><g></svg>'), /expected <\/g>/);
  assert.match(findXmlError('<svg><g>'), /unclosed <g>/);
  assert.match(findXmlError('<a/><b/>'), /more than one root/);
  assert.match(findXmlError('plain text'), /no root element/);
  assert.match(findXmlError('<svg a="1" a="2"/>'), /duplicate attribute/);
  assert.match(findXmlError('<svg a=1/>'), /malformed attributes/);
});

test('rejects bare ampersands in text and attributes', () => {
  assert.match(findXmlError('<svg>a & b</svg>'), /bare "&" in text/);
  assert.match(findXmlError('<svg a="x&y"/>'), /bare "&" in attributes/);
});
