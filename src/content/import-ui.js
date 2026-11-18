import { collectAll } from './importer.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function mountImportButton(store) {
  if (!location.pathname.startsWith('/saved')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'to-import-btn';
  btn.textContent = 'Import all saved posts';
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      const posts = await collectAll({
        root: document,
        scroll: () => window.scrollTo(0, document.documentElement.scrollHeight),
        wait: sleep,
        onProgress: (n) => { btn.textContent = `Collecting… ${n} posts`; },
      });
      const { added, skipped } = await store.savePosts(posts.map((p) => ({ ...p, savedAt: Date.now() })));
      btn.textContent = `Imported ${added} new (${skipped} already saved)`;
    } catch (e) {
      console.error('[Threads Organizer]', e);
      btn.textContent = 'Import failed, see console';
    }
    btn.disabled = false;
  });
  document.body.appendChild(btn);
}
