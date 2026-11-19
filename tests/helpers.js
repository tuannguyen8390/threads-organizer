// In-memory stand-in for chrome.storage.local: get(null | key | [keys]), set, remove.
// Every call yields to the event loop first so two stores sharing one area interleave.
export function memArea() {
  const d = new Map();
  const tick = () => new Promise((r) => setImmediate(r));
  const clone = (v) => structuredClone(v);
  return {
    async get(k) {
      await tick();
      const keys = k === null || k === undefined ? [...d.keys()] : Array.isArray(k) ? k : [k];
      const out = {};
      for (const key of keys) if (d.has(key)) Object.defineProperty(out, key, { value: clone(d.get(key)), enumerable: true, writable: true, configurable: true });
      return out;
    },
    async set(o) { await tick(); for (const [k, v] of Object.entries(o)) d.set(k, clone(v)); },
    async remove(k) { await tick(); for (const key of Array.isArray(k) ? k : [k]) d.delete(key); },
    // test-only peek, synchronous
    dump() { return Object.fromEntries([...d].map(([k, v]) => [k, clone(v)])); },
  };
}
export const post = (id, extra = {}) => ({
  id, url: `https://www.threads.com/@a/post/${id}`, author: 'a', text: `text ${id}`, ...extra,
});
