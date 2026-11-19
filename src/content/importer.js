import { findPostElements, parsePost } from './selectors.js';

// Top-level posts only: drop candidates nested inside a candidate of a different post id
// (quoted/embedded posts, parent context shown above a saved reply).
function topLevel(els) {
  const idOf = new Map(els.map((el) => [el, parsePost(el)?.id]));
  return els.filter((el) => !els.some((o) => o !== el && o.contains(el) && idOf.get(o) !== idOf.get(el)));
}

export async function collectAll({ root, scroll, wait, maxIdleRounds = 4, onProgress }) {
  const found = new Map();
  let idle = 0;
  while (idle < maxIdleRounds) {
    const before = found.size;
    for (const el of topLevel(findPostElements(root))) {
      const p = parsePost(el);
      if (p && !found.has(p.id)) found.set(p.id, p);
    }
    if (found.size !== before) onProgress?.(found.size);
    idle = found.size === before ? idle + 1 : 0;
    scroll();
    await wait(1200);
  }
  return [...found.values()];
}
