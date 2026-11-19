import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/lib/store.js';
import { memArea, post } from './helpers.js';

test('savePost creates with defaults and never overwrites', async () => {
  const s = createStore(memArea());
  const r1 = await s.savePost(post('P1'));
  assert.equal(r1.created, true);
  assert.deepEqual([r1.post.folderId, r1.post.tags, r1.post.note], [null, [], '']);
  await s.updatePost('P1', { note: 'keep me' });
  const r2 = await s.savePost(post('P1', { text: 'changed' }));
  assert.equal(r2.created, false);
  assert.equal(r2.post.note, 'keep me');
  assert.equal(r2.post.text, 'text P1');
});

test('savePosts reports added and skipped', async () => {
  const s = createStore(memArea());
  await s.savePost(post('P1'));
  assert.deepEqual(await s.savePosts([post('P1'), post('P2'), post('P3')]), { added: 2, skipped: 1 });
});

test('updatePost only changes editable fields', async () => {
  const s = createStore(memArea());
  await s.savePost(post('P1'));
  const p = await s.updatePost('P1', { tags: ['x'], text: 'hacked', id: 'Z' });
  assert.deepEqual(p.tags, ['x']);
  assert.equal(p.text, 'text P1');
  assert.equal(p.id, 'P1');
  assert.equal(await s.updatePost('nope', { note: 'n' }), null);
});

test('deletePost removes the post', async () => {
  const s = createStore(memArea());
  await s.savePost(post('P1'));
  await s.deletePost('P1');
  assert.deepEqual((await s.getAll()).posts, {});
});

test('deleteFolder unfiles its posts', async () => {
  const s = createStore(memArea());
  const f = await s.addFolder('  Ideas ');
  assert.equal(f.name, 'Ideas');
  await s.savePost(post('P1'));
  await s.updatePost('P1', { folderId: f.id });
  await s.deleteFolder(f.id);
  const db = await s.getAll();
  assert.equal(db.posts.P1.folderId, null);
  assert.deepEqual(db.folders, {});
});

test('merge adds missing items, keeps existing, drops dangling folder ids', async () => {
  const s = createStore(memArea());
  await s.savePost(post('P1'));
  await s.updatePost('P1', { note: 'mine' });
  const res = await s.merge({
    folders: [{ id: 'F1', name: 'Imported' }],
    posts: [post('P1', { note: 'theirs' }), post('P2', { folderId: 'F1' }), post('P3', { folderId: 'GONE' })],
  });
  assert.deepEqual(res, { added: 2, skipped: 1 });
  const db = await s.getAll();
  assert.equal(db.posts.P1.note, 'mine');
  assert.equal(db.posts.P2.folderId, 'F1');
  assert.equal(db.posts.P3.folderId, null);
});

test('concurrent writes are serialized (no lost updates)', async () => {
  const s = createStore(memArea());
  await Promise.all(Array.from({ length: 20 }, (_, i) => s.savePost(post(`P${i}`))));
  assert.equal(Object.keys((await s.getAll()).posts).length, 20);
});

test('insert tolerates non-array tags', async () => {
  const { createStore } = await import('../src/lib/store.js');
  const { memArea } = await import('./helpers.js');
  const s = createStore(memArea());
  await s.savePost({ id: 'T', url: 'u', author: 'a', text: '', tags: 'oops' });
  assert.deepEqual((await s.getAll()).posts.T.tags, []);
});

test('updateCounts sets counts on an existing post only', async () => {
  const s = createStore(memArea());
  await s.savePost(post('P1'));
  const r = await s.updateCounts('P1', { likes: 5, replies: 2.9, reposts: 0 });
  assert.deepEqual(r.counts, { likes: 5, replies: 2, reposts: 0 });
  assert.deepEqual((await s.getAll()).posts.P1.counts, { likes: 5, replies: 2, reposts: 0 });
  assert.equal(await s.updateCounts('NOPE', { likes: 1, replies: 1, reposts: 1 }), null);
  assert.equal((await s.getAll()).posts.NOPE, undefined);
});

test('updateCounts rejects invalid counts without changing the post', async () => {
  const s = createStore(memArea());
  await s.savePost(post('P1', { counts: { likes: 1, replies: 1, reposts: 1 } }));
  for (const bad of [null, {}, { likes: -1, replies: 0, reposts: 0 }, { likes: NaN, replies: 0, reposts: 0 },
    { likes: '3', replies: 0, reposts: 0 }, { likes: 1, replies: 0 }]) {
    assert.equal(await s.updateCounts('P1', bad), null);
  }
  assert.deepEqual((await s.getAll()).posts.P1.counts, { likes: 1, replies: 1, reposts: 1 });
});
