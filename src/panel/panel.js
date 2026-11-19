import { createStore } from '../lib/store.js';
import { filterPosts, allTags } from '../lib/search.js';
import { formatCount } from '../lib/format.js';
import { toMarkdown, toJSON, parseImport } from '../lib/exporter.js';

const store = createStore(chrome.storage.local);
const state = { db: { posts: {}, folders: {} }, query: '', folderId: undefined, tag: undefined,
  author: undefined, from: undefined, to: undefined };
const $ = (id) => document.getElementById(id);

function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  Object.assign(n, props);
  n.append(...kids);
  return n;
}

const visible = () => filterPosts(Object.values(state.db.posts), {
  query: state.query, folderId: state.folderId, tag: state.tag,
  author: state.author, from: state.from, to: state.to,
});
const folderList = () => Object.values(state.db.folders);
const say = (msg) => { $('status').textContent = msg; };

function chip(label, active, onclick) {
  return el('button', { className: `chip${active ? ' active' : ''}`, textContent: label, onclick });
}

// Replace a chip row only when its content changed, so a storage-triggered
// render never swaps out a chip that is being pressed.
function setChips(box, key, build) {
  if (box.dataset.key === key) return;
  box.dataset.key = key;
  box.replaceChildren(...build());
}

function renderFolders() {
  const fs = folderList();
  const key = JSON.stringify([state.folderId, state.tag, fs.map((f) => [f.id, f.name])]);
  setChips($('folders'), key, () => [
    chip('All', state.folderId === undefined && state.tag === undefined,
      () => { state.folderId = undefined; state.tag = undefined; render(); }),
    chip('To sort', state.folderId === null, () => { state.folderId = null; render(); }),
    ...fs.map((f) => {
      const c = chip(f.name, state.folderId === f.id, () => { state.folderId = f.id; render(); });
      if (state.folderId === f.id) {
        c.append(el('span', {
          textContent: ' ×', title: 'Delete folder (posts move back to To sort)',
          onclick: async (e) => { e.stopPropagation(); state.folderId = undefined; await store.deleteFolder(f.id); },
        }));
      }
      return c;
    }),
  ]);
}

function renderTags() {
  const tags = allTags(Object.values(state.db.posts));
  setChips($('tags'), JSON.stringify([state.tag, tags]), () => tags.map(({ tag, count }) =>
    chip(`#${tag} ${count}`, state.tag === tag, () => { state.tag = state.tag === tag ? undefined : tag; render(); })));
}

function renderAuthors() {
  const sel = $('author');
  const authors = [...new Set(Object.values(state.db.posts).map((p) => p.author))].sort((x, y) => x.localeCompare(y));
  const key = JSON.stringify(authors);
  if (sel.dataset.key !== key && document.activeElement !== sel) {
    sel.dataset.key = key;
    sel.replaceChildren(el('option', { value: '', textContent: 'All authors' }),
      ...authors.map((a) => el('option', { value: a, textContent: `@${a}` })));
  }
  if (document.activeElement !== sel && sel.value !== (state.author ?? '')) sel.value = state.author ?? '';
}

const parseTags = (s) => [...new Set(s.split(',').map((t) => t.trim().replace(/^#/, '').toLowerCase()).filter(Boolean))];

const cards = new Map(); // post id -> { node, refs, folderKey }
let emptyNode = null;

const current = (id) => state.db.posts[id];
const dateLabel = (p) => `@${p.author} · ${new Date(p.postedAt ?? p.savedAt).toLocaleDateString()}`;

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICONS = {
  likes: ['M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z'],
  replies: ['M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 19.5l1.3-4.5A7.5 7.5 0 1 1 20 11.5z'],
  reposts: ['M5 11V9.5A2.5 2.5 0 0 1 7.5 7H19', 'M16 4l3 3-3 3', 'M19 13v1.5a2.5 2.5 0 0 1-2.5 2.5H5', 'M8 20l-3-3 3-3'],
};
const COUNT_KEYS = ['likes', 'replies', 'reposts'];

function icon(kind) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [k, v] of Object.entries({ viewBox: '0 0 24 24', width: '12', height: '12', fill: 'none',
    stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    'aria-hidden': 'true' })) svg.setAttribute(k, v);
  for (const d of ICONS[kind]) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

const countsOf = (p) => (p.counts && COUNT_KEYS.every((k) => Number.isFinite(p.counts[k])) ? p.counts : null);

// Meta line: "@author · date" then, when the post has counts, "| icon n" for each count.
// Only rebuilt when its content key changes.
function setMeta(node, p) {
  const label = dateLabel(p);
  const counts = countsOf(p);
  const key = JSON.stringify([label, counts && COUNT_KEYS.map((k) => counts[k])]);
  if (node.dataset.key === key) return;
  node.dataset.key = key;
  const kids = [document.createTextNode(label)];
  if (counts) {
    const box = el('span', { className: 'counts', title: 'Counts when last seen on Threads' });
    for (const k of COUNT_KEYS) {
      box.append(el('span', { className: 'sep', textContent: '|' }), icon(k),
        el('span', { className: 'num', textContent: formatCount(counts[k]) }));
    }
    kids.push(box);
  }
  node.replaceChildren(...kids);
}

function makeCard(id) {
  const refs = {
    meta: el('div', { className: 'meta' }),
    text: el('div', { className: 'text' }),
    folder: el('select'),
    tags: el('input', { placeholder: 'tags, comma separated' }),
    note: el('textarea', { placeholder: 'Why does this matter?', rows: 2 }),
  };
  refs.folder.onchange = () => store.updatePost(id, { folderId: refs.folder.value || null });
  refs.tags.onchange = () => store.updatePost(id, { tags: parseTags(refs.tags.value) });
  refs.note.onchange = () => store.updatePost(id, { note: refs.note.value });

  const copy = (label, pick) => el('button', {
    textContent: label,
    onclick: async () => {
      const p = current(id);
      if (!p) return;
      try { await navigator.clipboard.writeText(pick(p)); say(`${label}: copied`); }
      catch { say(`${label}: copy failed`); }
    },
  });
  const node = el('article', { className: 'card' },
    refs.meta, refs.text, refs.folder, refs.tags, refs.note,
    el('div', { className: 'actions' },
      el('button', { textContent: 'Open', onclick: () => { const p = current(id); if (p) chrome.tabs.create({ url: p.url }); } }),
      copy('Copy link', (p) => p.url),
      copy('Copy text', (p) => p.text),
      el('button', { textContent: 'Remove', onclick: () => store.deletePost(id) })));
  return { node, refs, folderKey: null };
}

// Update a displayed value in place, never touching a control the user is in.
function setValue(ctrl, value) {
  if (document.activeElement !== ctrl && ctrl.value !== value) ctrl.value = value;
}
function setText(node, value) {
  if (node.textContent !== value) node.textContent = value;
}

function updateCard(c, p) {
  const { refs } = c;
  setMeta(refs.meta, p);
  setText(refs.text, p.text || '(no text)');
  const fs = folderList();
  const folderKey = JSON.stringify(fs.map((f) => [f.id, f.name]));
  if (c.folderKey !== folderKey && document.activeElement !== refs.folder) {
    c.folderKey = folderKey;
    refs.folder.replaceChildren(el('option', { value: '', textContent: 'To sort' }),
      ...fs.map((f) => el('option', { value: f.id, textContent: f.name })));
    refs.folder.value = '';
  }
  setValue(refs.folder, p.folderId ?? '');
  setValue(refs.tags, (p.tags ?? []).join(', '));
  setValue(refs.note, p.note ?? '');
}

function renderPosts() {
  const list = visible();
  const box = $('posts');
  const wanted = new Set(list.map((p) => p.id));
  for (const [id, c] of cards) {
    if (!wanted.has(id)) { c.node.remove(); cards.delete(id); }
  }
  if (list.length) {
    emptyNode?.remove();
    emptyNode = null;
  } else if (!emptyNode) {
    emptyNode = el('div', { className: 'empty', textContent: 'No posts here yet. Open threads.com and click Save on a post.' });
    box.append(emptyNode);
  }
  let ref = box.firstChild;
  for (const p of list) {
    let c = cards.get(p.id);
    if (!c) { c = makeCard(p.id); cards.set(p.id, c); }
    updateCard(c, p);
    // Only move nodes that are out of place; moving a focused node would blur it.
    if (c.node === ref) ref = ref.nextSibling;
    else box.insertBefore(c.node, ref);
  }
}

function render() {
  const posts = Object.values(state.db.posts);
  if (state.tag && !allTags(posts).some((t) => t.tag === state.tag)) state.tag = undefined;
  if (typeof state.folderId === 'string' && !state.db.folders[state.folderId]) state.folderId = undefined;
  if (state.author && !posts.some((p) => p.author === state.author)) state.author = undefined;
  renderFolders(); renderTags(); renderAuthors(); renderPosts();
}

async function load() { state.db = await store.getAll(); render(); }

function download(name, text, type) {
  const a = el('a', { href: URL.createObjectURL(new Blob([text], { type })), download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

$('search').oninput = (e) => { state.query = e.target.value; renderPosts(); };
$('author').onchange = (e) => { state.author = e.target.value || undefined; renderPosts(); };
// 'from' is the start of the selected day, 'to' the end of it (local time).
const dayBound = (v, end) => (v ? new Date(`${v}T${end ? '23:59:59.999' : '00:00:00'}`).getTime() : undefined);
$('date-from').onchange = (e) => { state.from = dayBound(e.target.value, false); renderPosts(); };
$('date-to').onchange = (e) => { state.to = dayBound(e.target.value, true); renderPosts(); };
$('new-folder').onsubmit = async (e) => {
  e.preventDefault();
  const name = $('folder-name').value.trim();
  if (!name) return;
  const f = await store.addFolder(name);
  $('folder-name').value = '';
  state.folderId = f.id;
  render();
};
$('open-saved').onclick = () => chrome.tabs.create({ url: 'https://www.threads.com/saved' });
$('export-md').onclick = () => download('threads-export.md', toMarkdown(visible(), folderList()), 'text/markdown');
$('export-json').onclick = () => download('threads-export.json', toJSON(visible(), folderList()), 'application/json');
$('import-json').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const { added, skipped } = await store.merge(parseImport(await file.text()));
    say(`Imported ${added} new, ${skipped} already here`);
  } catch (err) {
    say(err.message);
  }
  e.target.value = '';
};

chrome.storage.onChanged.addListener(load);
load();
