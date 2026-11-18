import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { findPostElements, parsePost } from '../src/content/selectors.js';

const load = () => new JSDOM(readFileSync(new URL('./fixtures/post.html', import.meta.url), 'utf8')).window.document;

test('findPostElements returns one element per post and skips non-posts', () => {
  const els = findPostElements(load());
  assert.deepEqual(els.map((e) => e.id), ['p1', 'p2']);
});

test('parsePost extracts id, author, url, text, media, time', () => {
  const [p1] = findPostElements(load());
  assert.deepEqual(parsePost(p1), {
    id: 'Cabc123',
    author: 'alice',
    url: 'https://www.threads.com/@alice/post/Cabc123',
    text: 'First line of the thread @bob is here',
    media: ['https://cdn.example/photo.jpg'],
    postedAt: '2026-11-01T10:00:00.000Z',
  });
});

test('parsePost returns null without a permalink', () => {
  assert.equal(parsePost(load().getElementById('not-a-post')), null);
});
