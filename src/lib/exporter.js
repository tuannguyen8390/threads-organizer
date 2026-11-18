const day = (p) => new Date(p.postedAt ?? p.savedAt).toISOString().slice(0, 10);

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
  if (!data.posts.every((p) => p && typeof p.id === 'string' && typeof p.url === 'string')) throw bad();
  return { posts: data.posts, folders: Array.isArray(data.folders) ? data.folders : [] };
}
