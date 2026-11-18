export function memArea() {
  const d = {};
  return {
    async get(k) { return k in d ? { [k]: structuredClone(d[k]) } : {}; },
    async set(o) { for (const [k, v] of Object.entries(o)) d[k] = structuredClone(v); },
  };
}
export const post = (id, extra = {}) => ({
  id, url: `https://www.threads.com/@a/post/${id}`, author: 'a', text: `text ${id}`, ...extra,
});
