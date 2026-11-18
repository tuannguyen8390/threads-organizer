import { parsePermalink } from '../lib/post.js';

const permalinkAnchor = (root) =>
  [...root.querySelectorAll('a[href*="/post/"]')].find((a) => parsePermalink(a.getAttribute('href')));

function containerFor(anchor) {
  const known = anchor.closest('[data-pressable-container="true"]') || anchor.closest('article');
  if (known) return known;
  let n = anchor.parentElement;
  for (let i = 0; n && i < 8; i++, n = n.parentElement) {
    if (n.querySelector('time')) return n;
  }
  return anchor.parentElement;
}

export function findPostElements(root) {
  const seen = new Set();
  for (const a of root.querySelectorAll('a[href*="/post/"]')) {
    if (!parsePermalink(a.getAttribute('href'))) continue;
    seen.add(containerFor(a));
  }
  return [...seen];
}

export function parsePost(el) {
  const link = permalinkAnchor(el);
  if (!link) return null;
  const { id, author, url } = parsePermalink(link.getAttribute('href'));

  const spans = [...el.querySelectorAll('span[dir="auto"]')]
    .filter((s) => !s.closest('a') && !s.closest('[role="button"]') && s.textContent.trim());
  const top = spans.filter((s) => !spans.some((o) => o !== s && o.contains(s)));
  const text = top.map((s) => s.textContent.trim()).join('\n');

  const media = [...el.querySelectorAll('img')]
    .filter((i) => !/profile picture/i.test(i.getAttribute('alt') ?? ''))
    .map((i) => i.getAttribute('src'))
    .filter((src) => src && src.startsWith('http'));

  const post = { id, url, author, text, media };
  const t = el.querySelector('time')?.getAttribute('datetime');
  if (t) post.postedAt = t;
  return post;
}

const BTN = '[role="button"], button';

// The post's "…" (More) menu button, or null. Used to position our button below it.
export function findMenuAnchor(el) {
  const label = el.querySelector('[aria-label="More"]');
  if (label) return label.closest(BTN) || label;
  for (const svg of el.querySelectorAll('svg[aria-label]')) {
    if (/^more$/i.test(svg.getAttribute('aria-label').trim())) return svg.closest(BTN) || svg;
  }
  const btn = [...el.querySelectorAll(BTN)].find((b) => /^more$/i.test((b.getAttribute('aria-label') ?? '').trim()));
  return btn ?? null;
}
