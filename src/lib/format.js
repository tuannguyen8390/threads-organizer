const UNITS = [[1e3, 'K'], [1e6, 'M'], [1e9, 'B']];

// 1200 -> "1.2K", 15300 -> "15K", 2400000 -> "2.4M".
export function formatCount(n) {
  if (n < 1000) return String(n);
  for (let i = 0; i < UNITS.length; i++) {
    const [size, suffix] = UNITS[i];
    const v = n / size;
    const r = v < 10 ? Math.round(v * 10) / 10 : Math.round(v);
    if (r < 1000 || i === UNITS.length - 1) return `${r}${suffix}`;
  }
  return String(n);
}

const SUFFIX = { k: 1e3, n: 1e3, m: 1e6, tr: 1e6, b: 1e9 };

// Parse a displayed count: "", "219", "1,234", "1.234", "1 234", "1.2K", "3,4M", "1,2N", "3Tr".
// Returns a non-negative integer, or null when the text is not a count.
export function parseCount(text) {
  const t = String(text ?? '').trim();
  if (!t) return 0;
  const m = /^(\d[\d.,\s  ]*)\s*(tr|k|m|b|n)?$/i.exec(t);
  if (!m) return null;
  const digits = m[1].trim();
  if (!m[2]) {
    const plain = digits.replace(/[.,\s  ]/g, '');
    return /^\d+$/.test(plain) ? Number(plain) : null;
  }
  if (!/^\d+(?:[.,]\d+)?$/.test(digits)) return null;
  return Math.round(Number(digits.replace(',', '.')) * SUFFIX[m[2].toLowerCase()]);
}
