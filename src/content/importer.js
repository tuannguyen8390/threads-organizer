import { findPostElements, parsePost } from './selectors.js';

export async function collectAll({ root, scroll, wait, maxIdleRounds = 4, onProgress }) {
  const found = new Map();
  let idle = 0;
  while (idle < maxIdleRounds) {
    const before = found.size;
    for (const el of findPostElements(root)) {
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
