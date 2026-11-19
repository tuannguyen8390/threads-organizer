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

const MORE_LABELS = ['More', 'More options', 'Thêm', 'Mehr', 'Más', 'Plus', 'Mais', 'Meer', 'Altro', 'Więcej',
  'Daha fazla', '更多', 'もっと見る', '더 보기', 'المزيد', 'Ещё'].map((l) => l.toLowerCase());
const isMoreLabel = (v) => {
  const t = (v ?? '').trim().toLowerCase();
  return Boolean(t) && MORE_LABELS.some((l) => t === l || t.startsWith(l));
};
const mine = (n) => Boolean(n.closest('.to-save-btn'));

function byLabel(el) {
  for (const n of el.querySelectorAll('[aria-label], [title], svg title')) {
    if (mine(n)) continue;
    const v = n.localName === 'title' ? n.textContent : (n.getAttribute('aria-label') || n.getAttribute('title'));
    if (isMoreLabel(v)) return n.closest(BTN) || (n.localName === 'title' ? n.parentElement : n);
  }
  return null;
}

function drawsThreeDots(svg) {
  if (svg.querySelectorAll('circle').length >= 3) return true;
  for (const tag of ['ellipse', 'rect']) {
    const sizes = [...svg.querySelectorAll(tag)].map((n) =>
      tag === 'ellipse' ? `${n.getAttribute('rx')}x${n.getAttribute('ry')}` : `${n.getAttribute('width')}x${n.getAttribute('height')}`);
    if (sizes.some((sz) => sizes.filter((o) => o === sz).length >= 3)) return true;
  }
  return false;
}

function byDots(el) {
  for (const svg of el.querySelectorAll('svg')) {
    if (mine(svg) || !drawsThreeDots(svg)) continue;
    return svg.closest(BTN) || svg.parentElement;
  }
  return null;
}

function byGeometry(el) {
  const box = el.getBoundingClientRect();
  if (!box.width) return null;
  let best = null;
  let bestRect = null;
  for (const b of el.querySelectorAll(BTN)) {
    if (mine(b)) continue;
    const r = b.getBoundingClientRect();
    if (!r.width || r.width > 48 || r.height > 48 || r.top - box.top > 80) continue;
    if (!best || r.right > bestRect.right || (r.right === bestRect.right && r.top > bestRect.top)) {
      best = b;
      bestRect = r;
    }
  }
  return best;
}

// The post's "…" (More) menu button as { anchor, how }; how is label | dots | geometry | none.
export function findMenuAnchorInfo(el) {
  for (const [how, find] of [['label', byLabel], ['dots', byDots], ['geometry', byGeometry]]) {
    const anchor = find(el);
    if (anchor) return { anchor, how };
  }
  return { anchor: null, how: 'none' };
}

// The post's "…" (More) menu button, or null. Used to position our button beside it.
export function findMenuAnchor(el) {
  return findMenuAnchorInfo(el).anchor;
}

const ROW_TOL = 18;
const ROW_REACH = 160;

// Icon-ish controls or thumbnails sitting just left of the anchor in its visual row
// (e.g. the pencil icon in the feed, the thumbnail on the Activity page).
export function findRowNeighbors(el, anchor) {
  if (!anchor) return [];
  const a = anchor.getBoundingClientRect();
  const aMid = a.top + a.height / 2;
  const out = [];
  for (const n of el.querySelectorAll('button, [role="button"], img, a')) {
    if (n === anchor || n.closest('.to-save-btn') || anchor.contains(n) || n.contains(anchor)) continue;
    if (n.tagName === 'A' && (n.textContent.trim().length > 12) && !n.querySelector('img, svg')) continue;
    const r = n.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    if (Math.abs(r.top + r.height / 2 - aMid) > ROW_TOL) continue;
    if (r.right > a.left + 2 || r.left < a.left - ROW_REACH) continue;
    out.push(n);
  }
  return out;
}
