import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  MAX_WORDS,
  MIN_WORDS,
  SEPARATORS,
  WORDS,
  generatePassphrase,
  passphraseEntropy,
} from '../../src/lib/passphrase.js';

/** @type {import('../../src/lib/passphrase.js').PassphraseOptions} */
const BASE = { words: 6, separator: '-', capitalize: false, includeNumber: false };
const WORD_SET = new Set(WORDS);

describe('EFF word list', () => {
  it('has 7776 unique lowercase words', () => {
    expect(WORDS).toHaveLength(7776);
    expect(WORD_SET.size).toBe(7776);
    for (const word of WORDS) {
      expect(word).toMatch(/^[a-z-]+$/);
    }
  });

  it('is byte-for-byte the official EFF list (SHA-256 of the rebuilt original file)', () => {
    // Rebuild the original "11111\tabacus" lines: dice rolls are the index in base 6, digits 1-6.
    const original = WORDS.map((word, i) => {
      const dice = i
        .toString(6)
        .padStart(5, '0')
        .replace(/[0-5]/g, (d) => String(Number(d) + 1));
      return `${dice}\t${word}\n`;
    }).join('');
    expect(createHash('sha256').update(original).digest('hex')).toBe(
      'addd35536511597a02fa0a9ff1e5284677b8883b83e986e43f15a3db996b903e',
    );
  });

  it('starts and ends with the known words', () => {
    expect(WORDS[0]).toBe('abacus');
    expect(WORDS.at(-1)).toBe('zoom');
  });
});

describe('generatePassphrase', () => {
  it('uses the requested number of words from the list', () => {
    for (const words of [MIN_WORDS, 6, MAX_WORDS]) {
      const parts = generatePassphrase({ ...BASE, words, separator: ' ' }).split(' ');
      expect(parts).toHaveLength(words);
      for (const part of parts) {
        expect(WORD_SET.has(part)).toBe(true);
      }
    }
  });

  it.each(SEPARATORS)('joins words with %j', (separator) => {
    const phrase = generatePassphrase({ ...BASE, separator, words: 4 });
    expect(phrase.split(separator).length).toBeGreaterThanOrEqual(4);
  });

  it('capitalizes every word', () => {
    const parts = generatePassphrase({ ...BASE, capitalize: true, separator: ' ' }).split(' ');
    for (const part of parts) {
      expect(part[0]).toBe(part[0].toUpperCase());
      expect(WORD_SET.has(part.toLowerCase())).toBe(true);
    }
  });

  it('adds exactly one digit when includeNumber is on', () => {
    for (let i = 0; i < 100; i += 1) {
      const phrase = generatePassphrase({ ...BASE, includeNumber: true, separator: ' ' });
      expect(phrase.match(/[0-9]/g)).toHaveLength(1);
      const parts = phrase.split(' ');
      expect(parts.filter((p) => /[0-9]$/.test(p))).toHaveLength(1);
    }
  });

  it.each([MIN_WORDS - 1, MAX_WORDS + 1, 2.5])('rejects %s words', (words) => {
    expect(() => generatePassphrase({ ...BASE, words })).toThrow(RangeError);
  });

  it('rejects unknown or empty separators', () => {
    expect(() => generatePassphrase({ ...BASE, separator: '' })).toThrow(RangeError);
    expect(() => generatePassphrase({ ...BASE, separator: '<script>' })).toThrow(RangeError);
  });
});

describe('passphraseEntropy', () => {
  it('is words * log2(7776)', () => {
    expect(passphraseEntropy(BASE)).toBeCloseTo(6 * Math.log2(7776), 10);
  });

  it('adds the digit and its position', () => {
    expect(passphraseEntropy({ ...BASE, includeNumber: true })).toBeCloseTo(
      6 * Math.log2(7776) + Math.log2(10) + Math.log2(6),
      10,
    );
  });

  it('returns 0 for invalid input', () => {
    expect(passphraseEntropy({ ...BASE, words: 0 })).toBe(0);
  });
});
