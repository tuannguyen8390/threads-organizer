import { createStore } from '../lib/store.js';
import { filterPosts, allTags } from '../lib/search.js';
import { toMarkdown, toJSON, parseImport } from '../lib/exporter.js';

const store = createStore(chrome.storage.local);
const state = { db: { posts: {}, folders: {} }, query: '', folderId: undefined, tag: undefined };
const $ = (id) => document.getElementById(id);

function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  Object.assign(n, props);
  n.append(...kids);
  return n;
}

const visible = () => filterPosts(Object.values(state.db.posts), {
  query: state.query, folderId: state.folderId, tag: state.tag,
});
const folderList = () => Object.values(state.db.folders);
const say = (msg) => { $('status').textContent = msg; };

function chip(label, active, onclick) {
  return el('button', { className: `chip${active ? ' active' : ''}`, textContent: label, onclick });
}

function renderFolders() {
  const box = $('folders');
  box.replaceChildren(
    chip('All', state.folderId === undefined, () => { state.folderId = undefined; render(); }),
    chip('Unfiled', state.folderId === null, () => { state.folderId = null; render(); }),
    ...folderList().map((f) => {
      const c = chip(f.name, state.folderId === f.id, () => { state.folderId = f.id; render(); });
      if (state.folderId === f.id) {
        c.append(el('span', {
          textContent: ' ×', title: 'Delete folder (posts become unfiled)',
          onclick: async (e) => { e.stopPropagation(); state.folderId = undefined; await store.deleteFolder(f.id); },
        }));
      }
      return c;
    }),
  );
}

function renderTags() {
  const tags = allTags(Object.values(state.db.posts));
  $('tags').replaceChildren(...tags.map(({ tag, count }) =>
    chip(`#${tag} ${count}`, state.tag === tag, () => { state.tag = state.tag === tag ? undefined : tag; render(); })));
}

const parseTags = (s) => [...new Set(s.split(',').map((t) => t.trim().replace(/^#/, '').toLowerCase()).filter(Boolean))];

function card(p) {
  const folderSel = el('select', {},
    el('option', { value: '', textContent: 'Unfiled' }),
    ...folderList().map((f) => el('option', { value: f.id, textContent: f.name })));
  folderSel.value = p.folderId ?? '';
  folderSel.onchange = () => store.updatePost(p.id, { folderId: folderSel.value || null });

  const tags = el('input', { value: p.tags.join(', '), placeholder: 'tags, comma separated' });
  tags.onchange = () => store.updatePost(p.id, { tags: parseTags(tags.value) });

  const note = el('textarea', { value: p.note, placeholder: 'Why does this matter?', rows: 2 });
  note.onchange = () => store.updatePost(p.id, { note: note.value });

  const copy = (label, value) => el('button', {
    textContent: label,
    onclick: async () => { await navigator.clipboard.writeText(value); say(`${label}: copied`); },
  });

  return el('article', { className: 'card' },
    el('div', { className: 'meta', textContent: `@${p.author} · ${new Date(p.postedAt ?? p.savedAt).toLocaleDateString()}` }),
    el('div', { className: 'text', textContent: p.text || '(no text)' }),
    folderSel, tags, note,
    el('div', { className: 'actions' },
      el('button', { textContent: 'Open', onclick: () => chrome.tabs.create({ url: p.url }) }),
      copy('Copy link', p.url),
      copy('Copy text', p.text),
      el('button', { textContent: 'Remove', onclick: () => store.deletePost(p.id) })));
}

function renderPosts() {
  const list = visible();
  $('posts').replaceChildren(...(list.length
    ? list.map(card)
    : [el('div', { className: 'empty', textContent: 'No posts here yet. Open threads.com and click Save on a post.' })]));
}

function render() { renderFolders(); renderTags(); renderPosts(); }

async function load() { state.db = await store.getAll(); render(); }

function download(name, text, type) {
  const a = el('a', { href: URL.createObjectURL(new Blob([text], { type })), download: name });
  a.click();
  URL.revokeObjectURL(a.href);
}

$('search').oninput = (e) => { state.query = e.target.value; renderPosts(); };
$('new-folder').onsubmit = async (e) => {
  e.preventDefault();
  const name = $('folder-name').value.trim();
  if (!name) return;
  const f = await store.addFolder(name);
  $('folder-name').value = '';
  state.folderId = f.id;
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
