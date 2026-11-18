import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePermalink } from '../src/lib/post.js';

test('parses a relative permalink', () => {
  assert.deepEqual(parsePermalink('/@alice/post/Cabc123'), {
    id: 'Cabc123', author: 'alice', url: 'https://www.threads.com/@alice/post/Cabc123',
  });
});

test('normalizes threads.net absolute links and strips query', () => {
  const r = parsePermalink('https://www.threads.net/@bob/post/Cdef_4-5?xmt=1');
  assert.equal(r.url, 'https://www.threads.com/@bob/post/Cdef_4-5');
  assert.equal(r.author, 'bob');
});

test('returns null for non-post links', () => {
  assert.equal(parsePermalink('/@alice'), null);
  assert.equal(parsePermalink('/search?q=x'), null);
  assert.equal(parsePermalink('http://['), null);
});

import { normalizePost } from '../src/lib/post.js';

test('normalizePost fills defaults and normalizes url/author', () => {
  const p = normalizePost({ id: 'X1', url: 'https://www.threads.net/@bob/post/X1?q=1' });
  assert.equal(p.url, 'https://www.threads.com/@bob/post/X1');
  assert.equal(p.author, 'bob');
  assert.equal(p.text, '');
  assert.equal(p.note, '');
  assert.deepEqual(p.tags, []);
  assert.deepEqual(p.media, []);
  assert.equal(p.folderId, null);
  assert.ok(Number.isFinite(p.savedAt));
  assert.equal('postedAt' in p, false);
});

test('normalizePost sanitizes wrong-typed fields', () => {
  const p = normalizePost({
    id: 'X1', url: '/@a/post/X1', author: 'zed', text: 5, note: {}, tags: ['a', 'a', '', 3, 'b'],
    media: ['u', 4], folderId: 7, savedAt: 'x', postedAt: 12,
  });
  assert.equal(p.author, 'zed');
  assert.equal(p.text, '');
  assert.equal(p.note, '');
  assert.deepEqual(p.tags, ['a', 'b']);
  assert.deepEqual(p.media, ['u']);
  assert.equal(p.folderId, null);
  assert.ok(Number.isFinite(p.savedAt));
  assert.equal('postedAt' in p, false);
  assert.equal(normalizePost({ id: 'X1', url: '/@a/post/X1', postedAt: '2026-01-01', folderId: 'F', savedAt: 5 }).postedAt, '2026-01-01');
});

test('normalizePost rejects unusable posts', () => {
  for (const bad of [null, 'x', {}, { id: 1, url: '/@a/post/X' }, { id: 'X', url: 'https://example.com/' }, { id: 'X', url: 5 }]) {
    assert.equal(normalizePost(bad), null);
  }
});
