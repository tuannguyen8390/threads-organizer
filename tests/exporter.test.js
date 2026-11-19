import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMarkdown, toJSON, parseImport } from '../src/lib/exporter.js';
import { post } from './helpers.js';

const folders = [{ id: 'F', name: 'Ideas' }, { id: 'G', name: 'Unused' }];
const posts = [
  post('P1', { author: 'alice', text: 'line one\nline two', tags: ['dev', 'rust'], note: 'read later',
    folderId: 'F', savedAt: Date.UTC(2026, 10, 1) }),
  post('P2', { folderId: null, savedAt: Date.UTC(2026, 10, 2) }),
];

test('markdown groups by folder and includes link, tags, note, quoted text', () => {
  const md = toMarkdown(posts, folders);
  assert.match(md, /## Ideas/);
  assert.match(md, /## To sort/);
  assert.match(md, /@alice/);
  assert.match(md, /2026-11-01/);
  assert.match(md, /https:\/\/www\.threads\.com\/@a\/post\/P1/);
  assert.match(md, /#dev #rust/);
  assert.match(md, /Note: read later/);
  assert.match(md, /> line one\n> line two/);
});

test('json round-trips and only includes used folders', () => {
  const out = parseImport(toJSON(posts, folders));
  assert.deepEqual(out.posts.map((p) => p.id), ['P1', 'P2']);
  assert.deepEqual(out.folders, [{ id: 'F', name: 'Ideas' }]);
});

test('parseImport rejects bad input', () => {
  for (const bad of ['not json', '{}', '{"posts":[{"id":1}]}', '[]']) {
    assert.throws(() => parseImport(bad), /Not a Threads Organizer export/);
  }
});

test('export survives invalid dates', () => {
  const md = toMarkdown([post('P9', { savedAt: NaN, postedAt: 'garbage' })], []);
  assert.match(md, /unknown date/);
});

test('parseImport drops malformed posts but keeps good ones', () => {
  const text = JSON.stringify({ posts: [post('P1'), { id: 'Z', url: 'https://example.com/' }, 5], folders: [{ id: 'F', name: 'n' }, { id: 1 }, null] });
  const out = parseImport(text);
  assert.deepEqual(out.posts.map((p) => p.id), ['P1']);
  assert.deepEqual(out.folders, [{ id: 'F', name: 'n' }]);
  assert.deepEqual(out.posts[0].tags, []);
});

test('parseImport accepts an empty export and rejects when every post is malformed', () => {
  assert.deepEqual(parseImport('{"posts":[]}'), { posts: [], folders: [] });
  assert.throws(() => parseImport('{"posts":[5,{"id":"a"}]}'), /Not a Threads Organizer export/);
});
