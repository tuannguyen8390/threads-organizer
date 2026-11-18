import { collectAll } from './importer.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function mountImportButton(store) {
  const existing = document.querySelector('.to-import-btn');
  if (!location.pathname.startsWith('/saved')) { existing?.remove(); return; }
  if (existing) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'to-import-btn';
  btn.textContent = 'Import all saved posts';
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      window.scrollTo(0, 0);
      await sleep(800);
      const posts = await collectAll({
        root: document,
        scroll: () => window.scrollTo(0, document.documentElement.scrollHeight),
        wait: sleep,
        onProgress: (n) => { btn.textContent = `Collecting… ${n} posts`; },
      });
      const now = Date.now();
      const { added, skipped } = await store.savePosts(posts.map((p, i) => ({ ...p, savedAt: now - i })));
      btn.textContent = `Imported ${added} new (${skipped} already saved)`;
    } catch (e) {
      console.error('[Threads Organizer]', e);
      btn.textContent = 'Import failed, see console';
    }
    btn.disabled = false;
  });
  document.body.appendChild(btn);
}
