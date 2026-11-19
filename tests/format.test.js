import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCount, parseCount } from '../src/lib/format.js';

test('formatCount compacts large numbers', () => {
  const cases = [[0, '0'], [999, '999'], [1000, '1K'], [1200, '1.2K'], [15300, '15K'],
    [999999, '1M'], [2400000, '2.4M'], [3100000000, '3.1B']];
  for (const [n, s] of cases) assert.equal(formatCount(n), s);
});

test('parseCount reads plain, grouped and suffixed numbers', () => {
  const cases = [['', 0], ['  ', 0], ['219', 219], ['1,234', 1234], ['1.234', 1234], ['1 234', 1234],
    ['1 234', 1234], ['1.2K', 1200], ['3,4M', 3400000], ['12K', 12000], ['2b', 2e9],
    ['1,2N', 1200], ['3Tr', 3000000], ['1,5 Tr', 1500000], ['12.345.678', 12345678]];
  for (const [s, n] of cases) assert.equal(parseCount(s), n, s);
});

test('parseCount returns null for non-numbers', () => {
  for (const s of ['Like', '1.2.3K', 'K', '12x']) assert.equal(parseCount(s), null, s);
});
