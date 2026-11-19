import { createStore } from '../lib/store.js';
import { findPostElements, parsePost, findMenuAnchorInfo, findRowNeighbors } from './selectors.js';
import { mountImportButton } from './import-ui.js';

const store = createStore(chrome.storage.local);
const MARK = 'data-to-id';

const SVG_NS = 'http://www.w3.org/2000/svg';
const svgPath = (d) => {
  const p = document.createElementNS(SVG_NS, 'path');
  p.setAttribute('d', d);
  return p;
};

// Stack of three cards (a collection); the top card is filled when saved. Built once, updated in place.
function buildIcon() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  // Top card; filled when saved.
  const body = svgPath('M12 4l8 4-8 4-8-4z');
  body.setAttribute('class', 'to-icon-body');
  const mid = svgPath('M4 12l8 4 8-4');
  const low = svgPath('M4 16l8 4 8-4');
  svg.append(body, mid, low);
  return svg;
}

const setLabel = (btn, saved) => {
  const text = saved ? 'Saved. Click to remove' : 'Save & organize';
  btn.title = text;
  btn.setAttribute('aria-label', text);
  btn.classList.toggle('to-saved', saved);
  btn.classList.remove('to-error');
};

const setError = (btn, message) => {
  btn.title = message;
  btn.setAttribute('aria-label', message);
  btn.classList.add('to-error');
  setTimeout(() => btn.classList.remove('to-error'), 2500);
};

// Place the icon left of the post's "..." (and of any icon/thumbnail just left of it),
// vertically centered on it, using real geometry; CSS default otherwise.
const GAP = 6;
function placeButton(btn, el) {
  const { anchor, how } = findMenuAnchorInfo(el);
  btn.dataset.toAnchor = how;
  if (!anchor) {
    btn.style.top = '';
    btn.style.right = '';
    return;
  }
  // Read all rects first, then write styles.
  const a = anchor.getBoundingClientRect();
  if (!a.width && !a.height) return; // hidden or not laid out yet
  const r = el.getBoundingClientRect();
  const h = btn.offsetHeight || 32;
  let leftEdge = a.left;
  for (const n of findRowNeighbors(el, anchor)) leftEdge = Math.min(leftEdge, n.getBoundingClientRect().left);
  const top = `${Math.round(a.top + a.height / 2 - r.top - h / 2)}px`;
  const right = `${Math.max(0, Math.round(r.right - leftEdge + GAP))}px`;
  if (btn.style.top !== top) btn.style.top = top;
  if (btn.style.right !== right) btn.style.right = right;
}

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
    placeButton(existing, el);
    return;
  }
  el.setAttribute(MARK, post.id);
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'to-save-btn';
  btn.dataset.toBtn = post.id;
  btn.appendChild(buildIcon());
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
      setError(btn, "Couldn't save this post");
    }
  });
  el.appendChild(btn);
  placeButton(btn, el);
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
let resizeTimer;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(scan, 200); });

chrome.storage.onChanged.addListener((_changes, areaName) => {
  if (areaName !== 'local') return;
  store.getAll().then((db) => {
    for (const btn of document.querySelectorAll('.to-save-btn')) {
      setLabel(btn, Boolean(db.posts[btn.dataset.toBtn]));
    }
  }).catch(console.error);
});
