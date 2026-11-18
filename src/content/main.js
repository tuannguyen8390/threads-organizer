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
  if (el.hasAttribute(MARK)) return;
  const post = parsePost(el);
  if (!post) return;
  el.setAttribute(MARK, post.id);
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'to-save-btn';
  btn.dataset.toBtn = post.id;
  setLabel(btn, savedIds.has(post.id));
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const fresh = parsePost(el);
      if (!fresh) throw new Error('parse failed');
      const db = await store.getAll();
      if (db.posts[fresh.id]) {
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
}

let timer;
const scheduleScan = () => { clearTimeout(timer); timer = setTimeout(scan, 300); };
new MutationObserver(scheduleScan).observe(document.body, { childList: true, subtree: true });
scan();

chrome.storage.onChanged.addListener(async () => {
  const db = await store.getAll();
  for (const btn of document.querySelectorAll('.to-save-btn')) {
    setLabel(btn, Boolean(db.posts[btn.dataset.toBtn]));
  }
});

mountImportButton(store);
