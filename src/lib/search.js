export function filterPosts(posts, opts = {}) {
  const { query = '', folderId, tag, author, from, to } = opts;
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return posts
    .filter((p) => {
      if (folderId !== undefined && (p.folderId ?? null) !== folderId) return false;
      if (tag && !p.tags.includes(tag)) return false;
      if (author && p.author !== author) return false;
      if (from !== undefined && p.savedAt < from) return false;
      if (to !== undefined && p.savedAt > to) return false;
      if (terms.length) {
        const hay = [p.text, p.author, p.note, ...p.tags].join('\n').toLowerCase();
        if (!terms.every((t) => hay.includes(t))) return false;
      }
      return true;
    })
    .sort((a, b) => b.savedAt - a.savedAt);
}

export function allTags(posts) {
  const counts = new Map();
  for (const p of posts) for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts].map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
