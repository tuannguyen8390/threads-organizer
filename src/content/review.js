import { formatCount } from '../lib/format.js';

export const SNIPPET_MAX = 120;

// First ~120 characters of the text, cut on a whitespace boundary, with an ellipsis when shortened.
export function makeSnippet(text, max = SNIPPET_MAX) {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  let cut = t.slice(0, max);
  if (!/\s/.test(t[max])) {
    const i = cut.search(/\s\S*$/);
    if (i > 0) cut = cut.slice(0, i);
  }
  return `${cut.trimEnd()}…`;
}

// "♥ 1.2K | 94 | 27" (likes | replies | reposts); empty string when there are no counts.
export function formatCountsText(counts) {
  if (!counts) return '';
  const parts = [];
  if (Number.isFinite(counts.likes)) parts.push(`♥ ${formatCount(counts.likes)}`);
  for (const k of ['replies', 'reposts']) if (Number.isFinite(counts[k])) parts.push(formatCount(counts[k]));
  return parts.join(' | ');
}

export function buildReviewItems(posts, savedIds = new Set()) {
  const saved = savedIds instanceof Set ? savedIds : new Set(savedIds);
  return posts.map((post) => {
    const alreadySaved = saved.has(post.id);
    return {
      post,
      checked: !alreadySaved,
      alreadySaved,
      snippet: makeSnippet(post.text),
      countsText: formatCountsText(post.counts),
    };
  });
}
