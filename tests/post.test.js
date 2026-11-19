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
  assert.equal(p.author, 'a'); // author always comes from the permalink, never from the file
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

test('normalizePost keeps valid counts (floored) and drops invalid ones', () => {
  const base = { id: 'X1', url: '/@a/post/X1' };
  assert.deepEqual(normalizePost({ ...base, counts: { likes: 5.9, replies: 0, reposts: 2, extra: 1 } }).counts,
    { likes: 5, replies: 0, reposts: 2 });
  for (const bad of [null, 5, 'x', {}, { likes: 1, replies: 2 }, { likes: -1, replies: 0, reposts: 0 },
    { likes: '1', replies: 0, reposts: 0 }, { likes: NaN, replies: 0, reposts: 0 }, { likes: Infinity, replies: 0, reposts: 0 }]) {
    assert.equal('counts' in normalizePost({ ...base, counts: bad }), false);
  }
});

test('normalizePost rejects an id that disagrees with the permalink', () => {
  assert.equal(normalizePost({ id: 'VICTIM', url: '/@a/post/X1' }), null);
  assert.equal(normalizePost({ url: '/@a/post/X1' }), null);
  assert.equal(normalizePost({ id: '__proto__', url: '/@a/post/X1' }), null);
});

test('normalizePost derives author from the permalink and copies only named fields', () => {
  const p = normalizePost({ id: 'X1', url: '/@real/post/X1', author: 'spoof', evil: 1, __proto__: { polluted: true } });
  assert.equal(p.author, 'real');
  assert.deepEqual(Object.keys(p).sort(), ['author', 'folderId', 'id', 'media', 'note', 'savedAt', 'tags', 'text', 'url']);
  assert.equal(({}).polluted, undefined);
});
