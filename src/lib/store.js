import { normalizeCounts } from './post.js';

// Layout: one storage key per post and per folder, so two contexts (the panel and
// each Threads tab) editing different posts can never overwrite each other.
const LEGACY_KEY = 'threadsOrganizer'; // old single-key layout: { posts, folders }
const POST = 'tops:post:';
const FOLDER = 'tops:folder:';
// Engagement counts live under their own key, written only by updateCounts, so a Threads tab
// refreshing counts can never overwrite a note, tag or folder the user just edited.
const COUNTS = 'tops:counts:';
// One-time copy of the pre-upgrade library. Never read, never deleted by the extension.
const BACKUP_KEY = 'tops:legacy-backup';
const EDITABLE = ['folderId', 'tags', 'note'];

const postKey = (id) => POST + id;
const folderKey = (id) => FOLDER + id;
const countsKey = (id) => COUNTS + id;
const isRecord = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Maps keyed by id must not have a prototype: ids like "__proto__" or "constructor" are plain data.
const emptyMap = () => Object.create(null);
const put = (map, key, value) => Object.defineProperty(map, key, { value, enumerable: true, writable: true, configurable: true });

// True when a chrome.storage.onChanged event touches anything this store owns.
export function isStoreChange(changes, areaName) {
  if (areaName !== 'local' || !changes) return false;
  return Object.keys(changes).some((k) => k === LEGACY_KEY || k.startsWith(POST) || k.startsWith(FOLDER) || k.startsWith(COUNTS));
}

// Defaults and sanity for a post about to be stored (new saves, imports and legacy migration alike).
function fill(p, folders) {
  const full = { folderId: null, tags: [], note: '', media: [], savedAt: Date.now(), ...p };
  if (!Array.isArray(full.tags)) full.tags = [];
  if (full.folderId && !Object.hasOwn(folders, full.folderId)) full.folderId = null;
  return full;
}

// A post without its counts: what goes under the post key.
function withoutCounts(p) {
  const { counts, ...rest } = p;
  return rest;
}

const validId = (id) => typeof id === 'string' && id !== '';

export function createStore(area) {
  let queue = Promise.resolve();

  // Move the legacy single-key database to per-key storage. Writes a key only when it is
  // absent, and removes the legacy key last, so it can be repeated or raced without losing data.
  async function migrate() {
    const r = await area.get(null); // fresh read: another context may have finished already
    if (!Object.hasOwn(r, LEGACY_KEY)) return;
    const legacy = r[LEGACY_KEY];
    const folders = emptyMap();
    for (const [k, v] of Object.entries(r)) if (k.startsWith(FOLDER) && isRecord(v)) put(folders, k.slice(FOLDER.length), v);
    const writes = {};
    if (!Object.hasOwn(r, BACKUP_KEY)) put(writes, BACKUP_KEY, legacy); // raw, even if malformed
    const lf = isRecord(legacy) && isRecord(legacy.folders) ? legacy.folders : {};
    for (const [id, f] of Object.entries(lf)) {
      if (!isRecord(f) || typeof f.name !== 'string') continue;
      if (!Object.hasOwn(r, folderKey(id))) { put(writes, folderKey(id), { id, name: f.name }); put(folders, id, f); }
    }
    const lp = isRecord(legacy) && isRecord(legacy.posts) ? legacy.posts : {};
    for (const [id, p] of Object.entries(lp)) {
      if (!isRecord(p) || Object.hasOwn(r, postKey(id))) continue;
      const full = { ...fill(p, folders), id };
      put(writes, postKey(id), withoutCounts(full));
      const c = normalizeCounts(full.counts);
      if (c && !Object.hasOwn(r, countsKey(id))) put(writes, countsKey(id), c);
    }
    // One batch: migrated keys and the backup first, then the legacy key goes.
    if (Object.keys(writes).length) await area.set(writes);
    await area.remove(LEGACY_KEY);
  }

  // keys: null reads everything; an array reads just those post/folder keys (plus the legacy
  // marker and each post's counts key). Returns { db, embedded }: embedded lists posts whose
  // counts were read from the old in-post field because no counts key exists yet.
  async function load(keys = null) {
    const wanted = keys && [LEGACY_KEY, ...keys, ...keys.filter((k) => k.startsWith(POST)).map((k) => COUNTS + k.slice(POST.length))];
    let r = await area.get(wanted);
    if (Object.hasOwn(r, LEGACY_KEY)) {
      await migrate();
      r = await area.get(keys ? wanted.slice(1) : null);
    }
    const db = { posts: emptyMap(), folders: emptyMap() };
    const embedded = new Set();
    for (const [k, v] of Object.entries(r)) {
      if (!isRecord(v)) continue;
      if (k.startsWith(POST)) put(db.posts, k.slice(POST.length), v);
      else if (k.startsWith(FOLDER)) put(db.folders, k.slice(FOLDER.length), v);
    }
    for (const [id, p] of Object.entries(db.posts)) {
      const c = Object.hasOwn(r, countsKey(id)) ? normalizeCounts(r[countsKey(id)]) : null;
      if (c) p.counts = c;
      else if (Object.hasOwn(p, 'counts')) { // old format: counts inside the post
        const old = normalizeCounts(p.counts);
        if (old) { p.counts = old; embedded.add(id); } else delete p.counts;
      }
    }
    return { db, embedded };
  }

  // Serialized per context. fn(db, w) edits db and records its changes through w.
  function mutate(keys, fn) {
    const run = queue.then(async () => {
      const { db, embedded } = await load(keys);
      const set = {};
      const remove = [];
      const w = {
        // Never writes counts over an existing counts key; only moves old embedded counts across.
        post(p, fresh = false) {
          put(db.posts, p.id, p);
          put(set, postKey(p.id), withoutCounts(p));
          if (fresh || embedded.has(p.id)) {
            const c = normalizeCounts(p.counts);
            if (c) put(set, countsKey(p.id), c);
          }
        },
        counts(id, c) { db.posts[id].counts = c; put(set, countsKey(id), c); },
        folder(f) { put(db.folders, f.id, f); put(set, folderKey(f.id), f); },
        dropPost(id) { delete db.posts[id]; remove.push(postKey(id), countsKey(id)); },
        dropFolder(id) { delete db.folders[id]; remove.push(folderKey(id)); },
      };
      const out = fn(db, w);
      if (Object.keys(set).length) await area.set(set);
      if (remove.length) await area.remove(remove);
      return out;
    });
    queue = run.catch(() => {});
    return run;
  }

  function insert(db, w, p) {
    if (!isRecord(p) || !validId(p.id) || Object.hasOwn(db.posts, p.id)) return false;
    w.post(fill(p, db.folders), true);
    return true;
  }

  const postKeys = (p) => (isRecord(p) && validId(p.id) ? [postKey(p.id), ...(validId(p.folderId) ? [folderKey(p.folderId)] : [])] : []);

  return {
    getAll: () => {
      const run = queue.then(async () => (await load()).db);
      queue = run.catch(() => {});
      return run;
    },
    savePost: (post) => mutate(postKeys(post), (db, w) => ({ created: insert(db, w, post), post: validId(post?.id) ? db.posts[post.id] : undefined })),
    savePosts: (posts) => mutate(null, (db, w) => {
      let added = 0;
      for (const p of posts) if (insert(db, w, p)) added++;
      return { added, skipped: posts.length - added };
    }),
    updatePost: (id, patch) => mutate([postKey(id)], (db, w) => {
      const p = Object.hasOwn(db.posts, id) ? db.posts[id] : null;
      if (!p) return null;
      for (const k of EDITABLE) if (k in patch) p[k] = patch[k];
      w.post(p);
      return p;
    }),
    updateCounts: (id, counts) => mutate([postKey(id)], (db, w) => {
      const p = Object.hasOwn(db.posts, id) ? db.posts[id] : null;
      const c = normalizeCounts(counts);
      if (!p || !c) return null;
      w.counts(id, c); // counts key only: the post key is never touched
      return p;
    }),
    deletePost: (id) => mutate([postKey(id)], (db, w) => { if (Object.hasOwn(db.posts, id)) w.dropPost(id); }),
    addFolder: (name) => mutate([], (db, w) => {
      const f = { id: crypto.randomUUID(), name: name.trim() };
      w.folder(f);
      return f;
    }),
    deleteFolder: (id) => mutate(null, (db, w) => {
      for (const p of Object.values(db.posts)) {
        if (p.folderId === id) { p.folderId = null; w.post(p); }
      }
      if (Object.hasOwn(db.folders, id)) w.dropFolder(id);
    }),
    merge: ({ posts = [], folders = [] }) => mutate(null, (db, w) => {
      for (const f of folders) if (isRecord(f) && validId(f.id) && typeof f.name === 'string' && !Object.hasOwn(db.folders, f.id)) w.folder({ id: f.id, name: f.name });
      let added = 0;
      for (const p of posts) if (insert(db, w, p)) added++;
      return { added, skipped: posts.length - added };
    }),
  };
}
