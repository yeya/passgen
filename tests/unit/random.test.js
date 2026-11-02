import { afterEach, describe, expect, it, vi } from 'vitest';
import { randomInt, randomItem, shuffle } from '../../src/lib/random.js';

/**
 * Pearson chi-square statistic for observed counts against a uniform expectation.
 *
 * @param {number[]} counts Observed counts per bucket.
 * @returns {number} The statistic.
 */
function chiSquare(counts) {
  const total = counts.reduce((a, b) => a + b, 0);
  const expected = total / counts.length;
  return counts.reduce((sum, c) => sum + (c - expected) ** 2 / expected, 0);
}

describe('randomInt', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns integers within [0, max)', () => {
    for (const max of [1, 2, 3, 10, 26, 7776, 2 ** 32]) {
      for (let i = 0; i < 200; i += 1) {
        const value = randomInt(max);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(max);
      }
    }
  });

  it.each([0, -1, 1.5, Number.NaN, 2 ** 32 + 1])('rejects invalid bound %s', (max) => {
    expect(() => randomInt(max)).toThrow(RangeError);
  });

  it('is uniform (chi-square test, 10 buckets)', () => {
    const counts = Array(10).fill(0);
    for (let i = 0; i < 50_000; i += 1) {
      counts[randomInt(10)] += 1;
    }
    // Critical value for 9 degrees of freedom at p = 0.001 is 27.88.
    expect(chiSquare(counts)).toBeLessThan(27.88);
  });

  it('uses rejection sampling to avoid modulo bias', () => {
    // For max = 3 the limit is 2^32 - (2^32 % 3) = 4294967295 - 0 ... compute explicitly:
    const max = 3;
    const limit = 2 ** 32 - (2 ** 32 % max);
    const values = [limit, limit + 0, 7];
    const spy = vi.spyOn(crypto, 'getRandomValues').mockImplementation((buffer) => {
      /** @type {Uint32Array} */ (buffer)[0] = values.shift() ?? 0;
      return buffer;
    });
    expect(randomInt(max)).toBe(7 % max);
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('never calls Math.random', () => {
    const spy = vi.spyOn(Math, 'random');
    randomInt(100);
    shuffle([1, 2, 3, 4]);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('randomItem', () => {
  it('picks an element of the collection', () => {
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i += 1) {
      expect(items).toContain(randomItem(items));
    }
    expect('xyz').toContain(randomItem('xyz'));
  });

  it('throws on an empty collection', () => {
    expect(() => randomItem([])).toThrow(RangeError);
  });
});

describe('shuffle', () => {
  it('returns the same array with the same elements', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const result = shuffle(items);
    expect(result).toBe(items);
    expect([...result].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('produces all 6 permutations of 3 items roughly equally', () => {
    /** @type {Record<string, number>} */
    const counts = {};
    for (let i = 0; i < 30_000; i += 1) {
      const key = shuffle(['a', 'b', 'c']).join('');
      counts[key] = (counts[key] ?? 0) + 1;
    }
    expect(Object.keys(counts)).toHaveLength(6);
    // 5 degrees of freedom, p = 0.001 → 20.52.
    expect(chiSquare(Object.values(counts))).toBeLessThan(20.52);
  });

  it('handles empty and single-element arrays', () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle([1])).toEqual([1]);
  });
});
