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
