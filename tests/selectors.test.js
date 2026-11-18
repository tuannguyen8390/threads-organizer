import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { findPostElements, parsePost, findMenuAnchor } from '../src/content/selectors.js';

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

test('findMenuAnchor returns the More button inside a post', () => {
  const doc = new JSDOM(`<div id="post"><div role="button" id="menu"><svg aria-label="More"></svg></div>
    <div role="button" id="other"><svg aria-label="Like"></svg></div></div>`).window.document;
  assert.equal(findMenuAnchor(doc.getElementById('post')).id, 'menu');
});

test('findMenuAnchor returns null when there is no More button', () => {
  assert.equal(findMenuAnchor(load().getElementById('p1')), null);
});
