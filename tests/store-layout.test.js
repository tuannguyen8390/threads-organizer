import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, isStoreChange } from '../src/lib/store.js';
import { memArea, post } from './helpers.js';

const LEGACY = 'threadsOrganizer';

test('each post and folder lives under its own key', async () => {
  const area = memArea();
  const s = createStore(area);
  const f = await s.addFolder('Ideas');
  await s.savePost(post('P1'));
  await s.savePost(post('P2'));
  assert.deepEqual(Object.keys(area.dump()).sort(), [`tops:folder:${f.id}`, 'tops:post:P1', 'tops:post:P2'].sort());
  assert.equal(area.dump()['tops:post:P1'].id, 'P1');
});

test('writes only touch the changed keys', async () => {
  const area = memArea();
  const s = createStore(area);
  await s.savePost(post('P1'));
  await s.savePost(post('P2'));
  const sets = [];
  const origSet = area.set;
  area.set = (o) => { sets.push(Object.keys(o)); return origSet(o); };
  await s.updatePost('P1', { note: 'n' });
  await s.updateCounts('P2', { likes: 1, replies: 1, reposts: 1 });
  assert.deepEqual(sets, [['tops:post:P1'], ['tops:post:P2']]);
});

test('deletePost removes only its key', async () => {
  const area = memArea();
  const s = createStore(area);
  await s.savePost(post('P1'));
  await s.savePost(post('P2'));
  await s.deletePost('P1');
  assert.deepEqual(Object.keys(area.dump()), ['tops:post:P2']);
  await s.deletePost('missing');
});

test('getAll ignores unrelated keys and returns null-prototype maps', async () => {
  const area = memArea();
  await area.set({ other: { posts: 1 }, 'tops:post:X': { id: 'X', url: 'u', author: 'a', text: '' } });
  const db = await createStore(area).getAll();
  assert.deepEqual(Object.keys(db.posts), ['X']);
  assert.equal(Object.getPrototypeOf(db.posts), null);
  assert.equal(Object.getPrototypeOf(db.folders), null);
});

test('deleteFolder unfiles posts with per-post writes only', async () => {
  const area = memArea();
  const s = createStore(area);
  const f = await s.addFolder('F');
  const g = await s.addFolder('G');
  await s.savePost(post('P1'));
  await s.savePost(post('P2'));
  await s.savePost(post('P3'));
  await s.updatePost('P1', { folderId: f.id });
  await s.updatePost('P2', { folderId: g.id });
  const sets = [];
  const removes = [];
  const [os, or] = [area.set, area.remove];
  area.set = (o) => { sets.push(Object.keys(o)); return os(o); };
  area.remove = (k) => { removes.push(k); return or(k); };
  await s.deleteFolder(f.id);
  assert.deepEqual(sets, [['tops:post:P1']]);
  assert.deepEqual(removes, [[`tops:folder:${f.id}`]]);
  const db = await s.getAll();
  assert.equal(db.posts.P1.folderId, null);
  assert.equal(db.posts.P2.folderId, g.id);
  assert.deepEqual(Object.keys(db.folders), [g.id]);
});

test('two stores over one area: edits to different posts are never lost', async () => {
  const area = memArea();
  const a = createStore(area);
  const b = createStore(area);
  await a.savePosts([post('P1'), post('P2')]);
  await Promise.all([
    a.updatePost('P1', { note: 'from A' }),
    b.updatePost('P2', { note: 'from B' }),
    a.updateCounts('P2', { likes: 3, replies: 0, reposts: 0 }),
    b.savePost(post('P3')),
    a.savePost(post('P4')),
  ]);
  const db = await a.getAll();
  assert.equal(db.posts.P1.note, 'from A');
  assert.equal(db.posts.P2.note, 'from B');
  assert.deepEqual(Object.keys(db.posts).sort(), ['P1', 'P2', 'P3', 'P4']);
});

test('two stores editing the same post leave one valid, uncorrupted post', async () => {
  const area = memArea();
  const a = createStore(area);
  const b = createStore(area);
  await a.savePost(post('P1'));
  await Promise.all([a.updatePost('P1', { note: 'A' }), b.updatePost('P1', { note: 'B' })]);
  const p = (await a.getAll()).posts.P1;
  assert.ok(['A', 'B'].includes(p.note));
  assert.equal(p.id, 'P1');
  assert.equal(p.text, 'text P1');
});

test('prototype-ish ids are ordinary ids', async () => {
  const area = memArea();
  const s = createStore(area);
  for (const id of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
    const r = await s.savePost(post(id));
    assert.equal(r.created, true, id);
  }
  const db = await s.getAll();
  assert.deepEqual(Object.keys(db.posts).sort(), ['__proto__', 'constructor', 'hasOwnProperty', 'toString']);
  assert.equal(Object.getPrototypeOf(db.posts), null);
  assert.equal(({}).polluted, undefined);
  assert.equal((await s.savePost(post('__proto__'))).created, false);
  await s.updatePost('__proto__', { note: 'ok' });
  assert.equal((await s.getAll()).posts.__proto__.note, 'ok');
  await s.deletePost('constructor');
  assert.equal(Object.hasOwn((await s.getAll()).posts, 'constructor'), false);
  // unsaved "constructor"-like ids read as absent
  assert.equal(await s.updatePost('valueOf', { note: 'x' }), null);
});

test('merge via two stores keeps both sides', async () => {
  const area = memArea();
  const a = createStore(area);
  const b = createStore(area);
  await Promise.all([a.merge({ posts: [post('A1')], folders: [{ id: 'F', name: 'n' }] }), b.merge({ posts: [post('B1')] })]);
  const db = await a.getAll();
  assert.deepEqual(Object.keys(db.posts).sort(), ['A1', 'B1']);
  assert.deepEqual(Object.keys(db.folders), ['F']);
});

test('isStoreChange recognises the new prefixes and the legacy key only', () => {
  assert.equal(isStoreChange({ 'tops:post:1': {} }, 'local'), true);
  assert.equal(isStoreChange({ 'tops:folder:1': {} }, 'local'), true);
  assert.equal(isStoreChange({ [LEGACY]: {} }, 'local'), true);
  assert.equal(isStoreChange({ other: {} }, 'local'), false);
  assert.equal(isStoreChange({ 'tops:post:1': {} }, 'sync'), false);
});

// ---- migration ----
const legacyDb = () => ({
  posts: {
    L1: { id: 'L1', url: 'https://www.threads.com/@a/post/L1', author: 'a', text: 'one', note: 'keep', tags: ['t'], folderId: 'LF', savedAt: 5 },
    L2: { id: 'L2', url: 'https://www.threads.com/@a/post/L2', author: 'a', text: 'two' }, // missing fields
  },
  folders: { LF: { id: 'LF', name: 'Legacy folder' } },
});

test('migration: legacy posts and folders move to per-key storage on getAll', async () => {
  const area = memArea();
  await area.set({ [LEGACY]: legacyDb() });
  const db = await createStore(area).getAll();
  assert.deepEqual(Object.keys(db.posts).sort(), ['L1', 'L2']);
  assert.equal(db.posts.L1.note, 'keep');
  assert.equal(db.posts.L1.folderId, 'LF');
  assert.equal(db.posts.L1.savedAt, 5);
  assert.deepEqual([db.posts.L2.folderId, db.posts.L2.tags, db.posts.L2.note, db.posts.L2.media], [null, [], '', []]);
  assert.ok(Number.isFinite(db.posts.L2.savedAt));
  assert.equal(db.folders.LF.name, 'Legacy folder');
  assert.equal(LEGACY in area.dump(), false);
  assert.deepEqual(Object.keys(area.dump()).sort(), ['tops:folder:LF', 'tops:post:L1', 'tops:post:L2']);
});

test('migration runs on the first mutation too, before the mutation applies', async () => {
  const area = memArea();
  await area.set({ [LEGACY]: legacyDb() });
  const s = createStore(area);
  await s.updatePost('L1', { note: 'edited' });
  assert.equal(LEGACY in area.dump(), false);
  const db = await s.getAll();
  assert.equal(db.posts.L1.note, 'edited');
  assert.ok(db.posts.L2);
  for (const op of [(x) => x.savePost(post('N')), (x) => x.addFolder('x'), (x) => x.deletePost('zz'), (x) => x.merge({})]) {
    const a2 = memArea();
    await a2.set({ [LEGACY]: legacyDb() });
    await op(createStore(a2));
    assert.equal(LEGACY in a2.dump(), false);
    assert.ok(Object.hasOwn(a2.dump(), 'tops:post:L1'));
  }
});

test('migration never overwrites a new key that already exists', async () => {
  const area = memArea();
  const newer = { id: 'L1', url: 'https://www.threads.com/@a/post/L1', author: 'a', text: 'NEW', note: 'newer note', tags: [], folderId: null, media: [], savedAt: 9 };
  await area.set({ [LEGACY]: legacyDb(), 'tops:post:L1': newer });
  const db = await createStore(area).getAll();
  assert.equal(db.posts.L1.note, 'newer note');
  assert.equal(db.posts.L1.text, 'NEW');
  assert.ok(db.posts.L2);
  assert.equal(LEGACY in area.dump(), false);
});

test('migration is idempotent and safe when two contexts migrate at once', async () => {
  const area = memArea();
  await area.set({ [LEGACY]: legacyDb() });
  const a = createStore(area);
  const b = createStore(area);
  const [d1, d2] = await Promise.all([a.getAll(), b.getAll()]);
  assert.deepEqual(Object.keys(d1.posts).sort(), ['L1', 'L2']);
  assert.deepEqual(Object.keys(d2.posts).sort(), ['L1', 'L2']);
  await a.updatePost('L1', { note: 'after' });
  const again = await b.getAll();
  assert.equal(again.posts.L1.note, 'after');
  assert.equal(LEGACY in area.dump(), false);
});

test('a second migration pass after the legacy key is gone changes nothing', async () => {
  const area = memArea();
  await area.set({ [LEGACY]: legacyDb() });
  await createStore(area).getAll();
  const before = JSON.stringify(area.dump());
  await createStore(area).getAll();
  assert.equal(JSON.stringify(area.dump()), before);
});

test('migration of an empty or junk legacy value just removes it', async () => {
  for (const legacy of [{ posts: {}, folders: {} }, {}, { posts: null }, 'junk', null]) {
    const area = memArea();
    await area.set({ [LEGACY]: legacy });
    const db = await createStore(area).getAll();
    assert.deepEqual([Object.keys(db.posts), Object.keys(db.folders)], [[], []]);
    assert.equal(LEGACY in area.dump(), false);
  }
});

test('migration keeps __proto__ ids as plain data and drops malformed entries', async () => {
  const area = memArea();
  const legacy = JSON.parse('{"posts":{"__proto__":{"id":"__proto__","url":"u","author":"a","text":"p"},"BAD":5,"G":{"id":"G","url":"u","author":"a","text":"g","tags":"oops","folderId":"NOPE"}},"folders":{"__proto__":{"id":"__proto__","name":"pf"}}}');
  await area.set({ [LEGACY]: legacy });
  const db = await createStore(area).getAll();
  assert.deepEqual(Object.keys(db.posts).sort(), ['G', '__proto__']);
  assert.deepEqual(db.posts.G.tags, []);
  assert.equal(db.posts.G.folderId, null);
  assert.equal(db.folders.__proto__.name, 'pf');
  assert.equal(({}).name, undefined);
});
