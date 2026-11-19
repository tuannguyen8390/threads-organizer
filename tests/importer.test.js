import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { collectAll } from '../src/content/importer.js';

const postHtml = (code) => `<div data-pressable-container="true" id="${code}">
  <a href="/@a/post/${code}"><time datetime="2026-01-01T00:00:00Z">1d</time></a>
  <span dir="auto">post ${code}</span></div>`;

test('collects posts revealed by scrolling, then stops when idle', async () => {
  const doc = new JSDOM(`<body>${postHtml('A1')}</body>`).window.document;
  const batches = [postHtml('B2'), postHtml('C3')];
  let scrolls = 0;
  const scroll = () => { scrolls++; const b = batches.shift(); if (b) doc.body.insertAdjacentHTML('beforeend', b); };
  const progress = [];
  const posts = await collectAll({
    root: doc, scroll, wait: async () => {}, maxIdleRounds: 2, onProgress: (n) => progress.push(n),
  });
  assert.deepEqual(posts.map((p) => p.id), ['A1', 'B2', 'C3']);
  assert.equal(scrolls, 5);
  assert.deepEqual(progress.slice(0, 3), [1, 2, 3]);
});

test('keeps posts even if they are removed from the DOM later (virtualized list)', async () => {
  const doc = new JSDOM(`<body>${postHtml('A1')}</body>`).window.document;
  let n = 0;
  const scroll = () => {
    n++;
    doc.body.innerHTML = n === 1 ? postHtml('B2') : '';
  };
  const posts = await collectAll({ root: doc, scroll, wait: async () => {}, maxIdleRounds: 1 });
  assert.deepEqual(posts.map((p) => p.id), ['A1', 'B2']);
});

test('empty page yields no posts and terminates', async () => {
  const doc = new JSDOM('<body></body>').window.document;
  assert.deepEqual(await collectAll({ root: doc, scroll() {}, wait: async () => {}, maxIdleRounds: 2 }), []);
});

const nested = (outer, inner) => `<div data-pressable-container="true" id="${outer}">
  <a href="/@a/post/${outer}"><time datetime="2026-01-01T00:00:00Z">1d</time></a>
  <span dir="auto">outer ${outer}</span>
  <div data-pressable-container="true" id="${inner}">
    <a href="/@q/post/${inner}"><time datetime="2026-01-01T00:00:00Z">2d</time></a>
    <span dir="auto">embedded ${inner}</span></div></div>`;

test('ignores embedded/quoted posts nested inside a saved post', async () => {
  const doc = new JSDOM(`<body>${nested('A1', 'Q9')}</body>`).window.document;
  const posts = await collectAll({ root: doc, scroll() {}, wait: async () => {}, maxIdleRounds: 1 });
  assert.deepEqual(posts.map((p) => p.id), ['A1']);
});

test('keeps two sibling posts', async () => {
  const doc = new JSDOM(`<body>${postHtml('A1')}${postHtml('B2')}</body>`).window.document;
  const posts = await collectAll({ root: doc, scroll() {}, wait: async () => {}, maxIdleRounds: 1 });
  assert.deepEqual(posts.map((p) => p.id), ['A1', 'B2']);
});

test('a same-id nested duplicate still collapses to one post', async () => {
  const doc = new JSDOM(`<body>${nested('A1', 'A1')}</body>`).window.document;
  const posts = await collectAll({ root: doc, scroll() {}, wait: async () => {}, maxIdleRounds: 1 });
  assert.deepEqual(posts.map((p) => p.id), ['A1']);
});
