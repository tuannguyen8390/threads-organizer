import { collectAll } from './importer.js';
import { buildReviewItems } from './review.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function h(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

// Modal listing the collected posts. Resolves with the ticked posts, or null when cancelled.
function reviewPosts(items, returnFocusTo) {
  return new Promise((resolve) => {
    const root = h('div', 'to-modal-root');
    const dialog = h('div', 'to-modal');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.tabIndex = -1;
    const title = h('h2', 'to-modal-title', 'Review before importing');
    title.id = 'to-modal-title';
    dialog.setAttribute('aria-labelledby', title.id);
    const sub = h('p', 'to-modal-sub', `Found ${items.length} posts on this page. Untick any you did not save.`);

    const tools = h('div', 'to-modal-tools');
    const allBtn = h('button', 'to-modal-btn', 'Select all');
    const noneBtn = h('button', 'to-modal-btn', 'Select none');
    for (const b of [allBtn, noneBtn]) b.type = 'button';
    tools.append(allBtn, noneBtn);

    const list = h('div', 'to-modal-list');
    const boxes = items.map((it) => {
      const row = h('label', 'to-modal-row');
      const box = h('input', 'to-modal-check');
      box.type = 'checkbox';
      box.checked = it.checked;
      const body = h('span', 'to-modal-body');
      const head = h('span', 'to-modal-head');
      head.append(h('span', 'to-modal-author', `@${it.post.author}`));
      if (it.post.postedAt) {
        const d = new Date(it.post.postedAt);
        if (!Number.isNaN(d.getTime())) head.append(h('span', 'to-modal-meta', d.toLocaleDateString()));
      }
      if (it.alreadySaved) head.append(h('span', 'to-modal-tag', 'already saved'));
      body.append(head);
      if (it.snippet) body.append(h('span', 'to-modal-snippet', it.snippet));
      if (it.countsText) body.append(h('span', 'to-modal-meta', it.countsText));
      row.append(box, body);
      list.append(row);
      return box;
    });

    const foot = h('div', 'to-modal-foot');
    const cancel = h('button', 'to-modal-btn', 'Cancel');
    const ok = h('button', 'to-modal-btn to-modal-primary');
    cancel.type = 'button';
    ok.type = 'button';
    foot.append(cancel, ok);

    const selected = () => items.filter((_, i) => boxes[i].checked);
    const refresh = () => {
      const n = selected().length;
      ok.textContent = `Import selected (${n})`;
      ok.disabled = n === 0;
    };
    const setAll = (v) => { for (const b of boxes) b.checked = v; refresh(); };
    allBtn.addEventListener('click', () => setAll(true));
    noneBtn.addEventListener('click', () => setAll(false));
    list.addEventListener('change', refresh);

    const close = (result) => {
      document.removeEventListener('keydown', onKey, true);
      root.remove();
      returnFocusTo?.focus();
      resolve(result);
    };
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(null); return; }
      if (e.key !== 'Tab') return;
      const f = [...dialog.querySelectorAll('input, button')].filter((x) => !x.disabled);
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (!dialog.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey, true);
    cancel.addEventListener('click', () => close(null));
    ok.addEventListener('click', () => close(selected().map((it) => it.post)));
    root.addEventListener('mousedown', (e) => { if (e.target === root) close(null); });

    dialog.append(title, sub, tools, list, foot);
    root.append(dialog);
    document.body.append(root);
    refresh();
    dialog.focus();
  });
}

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
      const saved = new Set(Object.keys((await store.getAll()).posts));
      btn.textContent = 'Import all saved posts';
      btn.disabled = false;
      const chosen = await reviewPosts(buildReviewItems(posts, saved), btn);
      btn.disabled = true;
      if (chosen) {
        const now = Date.now();
        const { added, skipped } = await store.savePosts(chosen.map((p, i) => ({ ...p, savedAt: now - i })));
        btn.textContent = `Imported ${added} new (${skipped} already saved)`;
      }
    } catch (e) {
      console.error('[Threads Organizer]', e);
      btn.textContent = 'Import failed, see console';
    }
    btn.disabled = false;
  });
  document.body.appendChild(btn);
}
