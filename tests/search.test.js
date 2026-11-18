import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterPosts, allTags } from '../src/lib/search.js';

const P = (id, o) => ({ id, author: 'a', text: '', note: '', tags: [], folderId: null, savedAt: 0, ...o });
const posts = [
  P('1', { text: 'Rust is fast', author: 'alice', tags: ['dev'], savedAt: 100 }),
  P('2', { text: 'Sourdough tips', author: 'bob', note: 'for weekend', folderId: 'F', tags: ['food', 'dev'], savedAt: 300 }),
  P('3', { text: 'Rust borrow checker', author: 'alice', folderId: 'F', savedAt: 200 }),
];
const ids = (r) => r.map((p) => p.id);

test('sorts newest saved first', () => assert.deepEqual(ids(filterPosts(posts)), ['2', '3', '1']));
test('query terms are ANDed across text, author, note, tags', () => {
  assert.deepEqual(ids(filterPosts(posts, { query: 'rust alice' })), ['3', '1']);
  assert.deepEqual(ids(filterPosts(posts, { query: 'weekend' })), ['2']);
  assert.deepEqual(ids(filterPosts(posts, { query: 'FOOD' })), ['2']);
  assert.deepEqual(ids(filterPosts(posts, { query: 'rust sourdough' })), []);
});
test('folder filter: id, null=unfiled, undefined=all', () => {
  assert.deepEqual(ids(filterPosts(posts, { folderId: 'F' })), ['2', '3']);
  assert.deepEqual(ids(filterPosts(posts, { folderId: null })), ['1']);
  assert.equal(filterPosts(posts, { folderId: undefined }).length, 3);
});
test('tag, author and date filters', () => {
  assert.deepEqual(ids(filterPosts(posts, { tag: 'dev' })), ['2', '1']);
  assert.deepEqual(ids(filterPosts(posts, { author: 'alice' })), ['3', '1']);
  assert.deepEqual(ids(filterPosts(posts, { from: 150, to: 250 })), ['3']);
});
test('allTags counts and sorts', () => {
  assert.deepEqual(allTags(posts), [{ tag: 'dev', count: 2 }, { tag: 'food', count: 1 }]);
});
