import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { findPostElements, parsePost, findMenuAnchor, findMenuAnchorInfo, findRowNeighbors } from '../src/content/selectors.js';

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

// jsdom has no layout: stub rects (left, top, width, height).
const rect = (el, l, t, w, h) => {
  el.getBoundingClientRect = () => ({ left: l, top: t, width: w, height: h, right: l + w, bottom: t + h, x: l, y: t });
  return el;
};

test('findRowNeighbors returns icon-ish controls left of the anchor in the same row', () => {
  const doc = new JSDOM(`<div id="post">
    <div role="button" id="menu"></div>
    <button id="pencil"></button>
    <img id="far-row" /><div role="button" id="below"></div>
    <div role="button" id="right"></div>
    <a id="long" href="#">this is a very long link text</a>
    <a id="thumb" href="#"><img id="thumb-img"></a>
    <button class="to-save-btn" id="mine"></button>
    <div role="button" id="toofar"></div>
  </div>`).window.document;
  const $ = (id) => doc.getElementById(id);
  const anchor = rect($('menu'), 900, 20, 24, 24);
  rect($('pencil'), 860, 20, 24, 24);
  rect($('below'), 860, 120, 24, 24);
  rect($('right'), 930, 20, 24, 24);
  rect($('long'), 800, 20, 40, 24);
  rect($('thumb'), 820, 10, 44, 44);
  rect($('mine'), 840, 20, 32, 32);
  rect($('thumb-img'), 822, 12, 40, 40);
  rect($('toofar'), 500, 20, 24, 24);
  rect($('far-row'), 860, 300, 24, 24);
  const ids = findRowNeighbors($('post'), anchor).map((e) => e.id).sort();
  assert.deepEqual(ids, ['pencil', 'thumb', 'thumb-img'].sort());
});

const mk = (html) => new JSDOM(html).window.document;
const NS = 'http://www.w3.org/2000/svg';

test('findMenuAnchor finds a localized label', () => {
  const doc = mk('<div id="post"><div role="button" id="menu" aria-label="Thêm"></div><div role="button" aria-label="Like"></div></div>');
  const info = findMenuAnchorInfo(doc.getElementById('post'));
  assert.equal(info.anchor.id, 'menu');
  assert.equal(info.how, 'label');
});

test('findMenuAnchor finds an unlabeled button with a three-dot svg', () => {
  const doc = mk(`<div id="post"><div role="button" id="like"><svg><path d="M0 0"/></svg></div>
    <div role="button" id="menu"><svg><circle r="1"/><circle r="1"/><circle r="1"/></svg></div></div>`);
  const info = findMenuAnchorInfo(doc.getElementById('post'));
  assert.equal(info.anchor.id, 'menu');
  assert.equal(info.how, 'dots');
});

test('findMenuAnchor geometric fallback picks the rightmost small button in the header', () => {
  const doc = mk(`<div id="post"><div role="button" id="a"></div><div role="button" id="b"></div>
    <div role="button" id="big"></div><div role="button" id="low"></div></div>`);
  const $ = (id) => doc.getElementById(id);
  rect($('post'), 0, 100, 600, 400);
  rect($('a'), 400, 110, 24, 24);
  rect($('b'), 540, 112, 24, 24);
  rect($('big'), 560, 105, 120, 60);
  rect($('low'), 570, 400, 24, 24);
  const info = findMenuAnchorInfo($('post'));
  assert.equal(info.anchor.id, 'b');
  assert.equal(info.how, 'geometry');
  assert.equal(findMenuAnchor($('post')).id, 'b');
});

test('findMenuAnchor never returns our own button', () => {
  const doc = mk(`<div id="post"><button class="to-save-btn" id="mine" aria-label="More"><svg><circle/><circle/><circle/></svg></button></div>`);
  rect(doc.getElementById('post'), 0, 0, 600, 400);
  rect(doc.getElementById('mine'), 500, 5, 32, 32);
  assert.equal(findMenuAnchor(doc.getElementById('post')), null);
});

test('findMenuAnchor returns null when nothing matches', () => {
  const doc = mk('<div id="post"><div role="button" aria-label="Like"><svg><path d="M0 0"/></svg></div></div>');
  assert.deepEqual(findMenuAnchorInfo(doc.getElementById('post')), { anchor: null, how: 'none' });
});

import { parseCounts } from '../src/content/selectors.js';

const icon = '<svg><title>icon</title><path d="M0 0"/></svg>';
const row = (counts) => counts.map((c) => `<div><div role="button">${icon}<span>${c}</span></div></div>`).join('');
const postHtml = (inner) => `<div data-pressable-container="true" id="post">
  <a href="/@alice/post/Cabc123"><time datetime="2026-11-01T10:00:00.000Z">2d</time></a>
  <span dir="auto">hello</span>
  <div role="button" id="menu"><svg><circle r="1"/><circle r="1"/><circle r="1"/></svg></div>${inner}</div>`;

test('parseCounts reads like/reply/repost from the action row', () => {
  const doc = mk(postHtml(`<div id="actions">${row(['219', '2', '1', '4'])}<div role="button">${icon}</div></div>`));
  assert.deepEqual(parseCounts(doc.getElementById('post')), { likes: 219, replies: 2, reposts: 1 });
});

test('parseCounts treats an empty count as 0 and parses K/M/grouped', () => {
  const p = (c) => parseCounts(mk(postHtml(`<div>${row(c)}</div>`)).getElementById('post'));
  assert.deepEqual(p(['', '', '', '']), { likes: 0, replies: 0, reposts: 0 });
  assert.deepEqual(p(['1.2K', '3,4M', '1,234', '5']), { likes: 1200, replies: 3400000, reposts: 1234 });
});

test('parseCounts picks the lowest row and ignores the header menu', () => {
  const doc = mk(postHtml(`<div id="mid">${row(['9', '9', '9'])}</div><div id="low">${row(['7', '8', '9', '1'])}</div>`));
  assert.deepEqual(parseCounts(doc.getElementById('post')), { likes: 7, replies: 8, reposts: 9 });
});

test('parseCounts returns null without an action row', () => {
  assert.equal(parseCounts(mk(postHtml('')).getElementById('post')), null);
  assert.equal(parseCounts(mk(postHtml(`<div>${row(['1', '2'])}</div>`)).getElementById('post')), null);
  assert.equal(parseCounts(load().getElementById('p1')), null);
});

test('parsePost includes counts when an action row exists', () => {
  const doc = mk(postHtml(`<div>${row(['219', '2', '1', '4'])}</div>`));
  const p = parsePost(doc.getElementById('post'));
  assert.deepEqual(p.counts, { likes: 219, replies: 2, reposts: 1 });
  assert.equal('counts' in parsePost(findPostElements(load())[0]), false);
});
