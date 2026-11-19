import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReviewItems, formatCountsText, makeSnippet } from '../src/content/review.js';
import { post } from './helpers.js';

test('snippet keeps short text and collapses whitespace', () => {
  assert.equal(makeSnippet('a  b\nc'), 'a b c');
});

test('snippet truncates on a whitespace boundary with an ellipsis', () => {
  const text = `${'word '.repeat(40)}end`;
  const s = makeSnippet(text);
  assert.ok(s.endsWith('…'));
  assert.ok(s.length <= 121);
  assert.equal(s, `${'word '.repeat(23)}word…`);
});

test('snippet does not cut inside a word', () => {
  const s = makeSnippet(`${'a'.repeat(110)} ${'b'.repeat(30)}`);
  assert.equal(s, `${'a'.repeat(110)}…`);
});

test('counts text uses compact numbers', () => {
  assert.equal(formatCountsText({ likes: 1200, replies: 94, reposts: 27 }), '♥ 1.2K | 94 | 27');
  assert.equal(formatCountsText({ likes: 0, replies: 0, reposts: 0 }), '♥ 0 | 0 | 0');
  assert.equal(formatCountsText(undefined), '');
});

test('buildReviewItems unchecks posts already in the library', () => {
  const items = buildReviewItems(
    [post('A', { counts: { likes: 1, replies: 2, reposts: 3 } }), post('B')],
    new Set(['B']),
  );
  assert.deepEqual(items.map((i) => [i.post.id, i.checked, i.alreadySaved]), [['A', true, false], ['B', false, true]]);
  assert.equal(items[0].countsText, '♥ 1 | 2 | 3');
  assert.equal(items[1].countsText, '');
  assert.equal(items[0].snippet, 'text A');
});
