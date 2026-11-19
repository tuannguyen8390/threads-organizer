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

const count = (v) => Number.isFinite(v) && v >= 0;
export function normalizeCounts(c) {
  if (!c || typeof c !== 'object') return null;
  if (!count(c.likes) || !count(c.replies) || !count(c.reposts)) return null;
  return { likes: Math.floor(c.likes), replies: Math.floor(c.replies), reposts: Math.floor(c.reposts) };
}

// Coerce an untrusted post object (e.g. from an imported file) into a safe shape.
// Returns null when the post has no usable id/permalink.
export function normalizePost(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.id !== 'string' || typeof raw.url !== 'string') return null;
  const link = parsePermalink(raw.url);
  if (!link) return null;
  // The permalink is the source of truth; an id or author that disagrees with it is forged or corrupt.
  if (raw.id !== link.id) return null;
  const post = {
    id: link.id,
    url: link.url,
    author: link.author,
    text: typeof raw.text === 'string' ? raw.text : '',
    note: typeof raw.note === 'string' ? raw.note : '',
    tags: [...new Set(strings(raw.tags).filter(Boolean))],
    media: strings(raw.media),
    folderId: typeof raw.folderId === 'string' ? raw.folderId : null,
    savedAt: Number.isFinite(raw.savedAt) ? raw.savedAt : Date.now(),
  };
  if (typeof raw.postedAt === 'string') post.postedAt = raw.postedAt;
  const counts = normalizeCounts(raw.counts);
  if (counts) post.counts = counts;
  return post;
}
