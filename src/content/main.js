import { createStore } from '../lib/store.js';
import { findPostElements, parsePost } from './selectors.js';
import { mountImportButton } from './import-ui.js';

const store = createStore(chrome.storage.local);
const MARK = 'data-to-id';

const setLabel = (btn, saved) => {
  btn.textContent = saved ? 'Saved ✓' : 'Save';
  btn.classList.toggle('to-saved', saved);
};

function decorate(el, savedIds) {
  const post = parsePost(el);
  if (!post) return;
  // React may re-create or recycle nodes: re-check on every scan.
  const existing = el.querySelector(':scope > .to-save-btn');
  if (existing) {
    if (el.getAttribute(MARK) !== post.id) {
      el.setAttribute(MARK, post.id);
      existing.dataset.toBtn = post.id;
      setLabel(existing, savedIds.has(post.id));
    }
    return;
  }
  el.setAttribute(MARK, post.id);
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'to-save-btn';
  btn.dataset.toBtn = post.id;
  btn.title = 'Click to remove from Threads Organizer';
  setLabel(btn, savedIds.has(post.id));
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const fresh = parsePost(el);
      if (!fresh) throw new Error('parse failed');
      const db = await store.getAll();
      const saved = db.posts[fresh.id];
      if (saved) {
        const curated = (saved.note ?? '').trim() || (saved.tags ?? []).length || saved.folderId;
        if (curated && !confirm('Remove this post and its note/tags/folder?')) return;
        await store.deletePost(fresh.id);
        setLabel(btn, false);
      } else {
        await store.savePost({ ...fresh, savedAt: Date.now() });
        setLabel(btn, true);
      }
    } catch (err) {
      console.error('[Threads Organizer]', err);
      btn.textContent = "Couldn't read this post";
    }
  });
  el.appendChild(btn);
}

async function scan() {
  const db = await store.getAll();
  const savedIds = new Set(Object.keys(db.posts));
  for (const el of findPostElements(document)) decorate(el, savedIds);
  mountImportButton(store);
}

let timer;
const scheduleScan = () => { clearTimeout(timer); timer = setTimeout(scan, 300); };
new MutationObserver(scheduleScan).observe(document.body, { childList: true, subtree: true });
scan();

chrome.storage.onChanged.addListener((_changes, areaName) => {
  if (areaName !== 'local') return;
  store.getAll().then((db) => {
    for (const btn of document.querySelectorAll('.to-save-btn')) {
      setLabel(btn, Boolean(db.posts[btn.dataset.toBtn]));
    }
  }).catch(console.error);
});
