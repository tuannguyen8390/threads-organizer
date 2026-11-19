import { normalizePost } from './post.js';
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const day = (p) => {
  const d = new Date(p.postedAt ?? p.savedAt);
  return Number.isNaN(d.getTime()) ? 'unknown date' : d.toISOString().slice(0, 10);
};

// Untrusted text (imported files, folder names, notes) must not create structure or links in the
// exported Markdown: single-line fields lose their line breaks, and Markdown/HTML punctuation is escaped.
const LINE_BREAKS = /\r\n|[\r\n\u2028\u2029\u0085\v\f]/;
const esc = (s) => String(s).replace(/[\\`*_[\]()<>#!|~]/g, '\\$&');
const oneLine = (s) => esc(String(s).split(LINE_BREAKS).map((l) => l.trim()).filter(Boolean).join(' '));
const quote = (s, escape) => String(s).split(LINE_BREAKS).map((l) => `> ${escape ? esc(l) : l.replace(/</g, '\\<')}`);

export function toMarkdown(posts, folders) {
  const names = new Map(folders.map((f) => [f.id, f.name]));
  const groups = new Map();
  for (const p of posts) {
    const name = names.get(p.folderId) ?? 'To sort';
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(p);
  }
  const out = ['# Threads export', ''];
  for (const [name, list] of groups) {
    out.push(`## ${oneLine(name)}`, '');
    for (const p of list) {
      out.push(`### @${oneLine(p.author)} · ${day(p)}`, '');
      if (p.text) out.push(...quote(p.text, false), '');
      out.push(`Link: ${p.url}`);
      if (p.counts) {
        const { likes, replies, reposts } = p.counts;
        out.push(`Engagement: ${plural(likes, 'like', 'likes')}, ${plural(replies, 'reply', 'replies')}, ${plural(reposts, 'repost', 'reposts')}`);
      }
      const tags = p.tags ?? [];
      if (tags.length) out.push(`Tags: ${tags.map((t) => `#${oneLine(t).replace(/ /g, '-')}`).join(' ')}`);
      if (p.note) {
        const lines = String(p.note).split(LINE_BREAKS).filter((l) => l.trim());
        if (lines.length === 1) out.push(`Note: ${oneLine(lines[0])}`);
        else if (lines.length) out.push('Note:', ...quote(lines.join('\n'), true));
      }
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
