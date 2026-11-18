import { normalizePost } from './post.js';
const day = (p) => {
  const d = new Date(p.postedAt ?? p.savedAt);
  return Number.isNaN(d.getTime()) ? 'unknown date' : d.toISOString().slice(0, 10);
};

export function toMarkdown(posts, folders) {
  const names = new Map(folders.map((f) => [f.id, f.name]));
  const groups = new Map();
  for (const p of posts) {
    const name = names.get(p.folderId) ?? 'Unfiled';
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(p);
  }
  const out = ['# Threads export', ''];
  for (const [name, list] of groups) {
    out.push(`## ${name}`, '');
    for (const p of list) {
      out.push(`### @${p.author} · ${day(p)}`, '');
      if (p.text) out.push(...p.text.split('\n').map((l) => `> ${l}`), '');
      out.push(`Link: ${p.url}`);
      const tags = p.tags ?? [];
      if (tags.length) out.push(`Tags: ${tags.map((t) => `#${t}`).join(' ')}`);
      if (p.note) out.push(`Note: ${p.note}`);
      out.push('');
    }
  }
  return out.join('\n');
}

export function toJSON(posts, folders) {
  const used = new Set(posts.map((p) => p.folderId));
  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    folders: folders.filter((f) => used.has(f.id)),
    posts,
  }, null, 2);
}

export function parseImport(text) {
  const bad = () => new Error('Not a Threads Organizer export');
  let data;
  try { data = JSON.parse(text); } catch { throw bad(); }
  if (!data || !Array.isArray(data.posts)) throw bad();
  // A valid top-level shape with some malformed posts keeps the good ones and
  // drops the rest; only when posts were present and NONE are usable is the
  // file treated as not an export at all.
  const posts = data.posts.map(normalizePost).filter(Boolean);
  if (data.posts.length > 0 && posts.length === 0) throw bad();
  const folders = (Array.isArray(data.folders) ? data.folders : [])
    .filter((f) => f && typeof f.id === 'string' && typeof f.name === 'string')
    .map((f) => ({ id: f.id, name: f.name }));
  return { posts, folders };
}
