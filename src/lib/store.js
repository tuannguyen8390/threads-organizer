import { normalizeCounts } from './post.js';

const KEY = 'threadsOrganizer';
const EDITABLE = ['folderId', 'tags', 'note'];
const emptyDb = () => ({ posts: {}, folders: {} });

export function createStore(area) {
  let queue = Promise.resolve();

  async function load() {
    const r = await area.get(KEY);
    return r[KEY] ?? emptyDb();
  }

  function mutate(fn) {
    const run = queue.then(async () => {
      const db = await load();
      const out = fn(db);
      await area.set({ [KEY]: db });
      return out;
    });
    queue = run.catch(() => {});
    return run;
  }

  function insert(db, p) {
    if (db.posts[p.id]) return false;
    const full = { folderId: null, tags: [], note: '', media: [], savedAt: Date.now(), ...p };
    if (!Array.isArray(full.tags)) full.tags = [];
    if (full.folderId && !db.folders[full.folderId]) full.folderId = null;
    db.posts[p.id] = full;
    return true;
  }

  return {
    getAll: load,
    savePost: (post) => mutate((db) => ({ created: insert(db, post), post: db.posts[post.id] })),
    savePosts: (posts) => mutate((db) => {
      let added = 0;
      for (const p of posts) if (insert(db, p)) added++;
      return { added, skipped: posts.length - added };
    }),
    updatePost: (id, patch) => mutate((db) => {
      const p = db.posts[id];
      if (!p) return null;
      for (const k of EDITABLE) if (k in patch) p[k] = patch[k];
      return p;
    }),
    updateCounts: (id, counts) => mutate((db) => {
      const p = db.posts[id];
      const c = normalizeCounts(counts);
      if (!p || !c) return null;
      p.counts = c;
      return p;
    }),
    deletePost: (id) => mutate((db) => { delete db.posts[id]; }),
    addFolder: (name) => mutate((db) => {
      const f = { id: crypto.randomUUID(), name: name.trim() };
      db.folders[f.id] = f;
      return f;
    }),
    deleteFolder: (id) => mutate((db) => {
      delete db.folders[id];
      for (const p of Object.values(db.posts)) if (p.folderId === id) p.folderId = null;
    }),
    merge: ({ posts = [], folders = [] }) => mutate((db) => {
      for (const f of folders) if (!db.folders[f.id]) db.folders[f.id] = f;
      let added = 0;
      for (const p of posts) if (insert(db, p)) added++;
      return { added, skipped: posts.length - added };
    }),
  };
}
