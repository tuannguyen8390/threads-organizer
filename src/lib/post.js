const POST_PATH = /^\/@([^/]+)\/post\/([A-Za-z0-9_-]+)/;

export function parsePermalink(href, base = 'https://www.threads.com') {
  let u;
  try { u = new URL(href, base); } catch { return null; }
  const m = POST_PATH.exec(u.pathname);
  if (!m) return null;
  const [, author, id] = m;
  return { id, author, url: `https://www.threads.com/@${author}/post/${id}` };
}
