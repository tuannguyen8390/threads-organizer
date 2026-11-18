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
  assert.match(md, /## Unfiled/);
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
