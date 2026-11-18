const POST_PATH = /^\/@([^/]+)\/post\/([A-Za-z0-9_-]+)/;

export function parsePermalink(href, base = 'https://www.threads.com') {
  let u;
  try { u = new URL(href, base); } catch { return null; }
  const m = POST_PATH.exec(u.pathname);
  if (!m) return null;
  const [, author, id] = m;
  return { id, author, url: `https://www.threads.com/@${author}/post/${id}` };
}

const strings = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);

// Coerce an untrusted post object (e.g. from an imported file) into a safe shape.
// Returns null when the post has no usable id/permalink.
export function normalizePost(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.id !== 'string' || typeof raw.url !== 'string') return null;
  const link = parsePermalink(raw.url);
  if (!link) return null;
  const post = {
    id: raw.id,
    url: link.url,
    author: typeof raw.author === 'string' && raw.author ? raw.author : link.author,
    text: typeof raw.text === 'string' ? raw.text : '',
    note: typeof raw.note === 'string' ? raw.note : '',
    tags: [...new Set(strings(raw.tags).filter(Boolean))],
    media: strings(raw.media),
    folderId: typeof raw.folderId === 'string' ? raw.folderId : null,
    savedAt: Number.isFinite(raw.savedAt) ? raw.savedAt : Date.now(),
  };
  if (typeof raw.postedAt === 'string') post.postedAt = raw.postedAt;
  return post;
}
