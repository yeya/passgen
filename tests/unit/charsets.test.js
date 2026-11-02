import { describe, expect, it } from 'vitest';
import {
  AMBIGUOUS,
  DEFAULT_SYMBOLS,
  DIGITS,
  LOWERCASE,
  UPPERCASE,
  sanitizeSymbols,
  uniqueChars,
  withoutChars,
} from '../../src/lib/charsets.js';

describe('charsets', () => {
  it('has the expected base sets', () => {
    expect(LOWERCASE).toHaveLength(26);
    expect(UPPERCASE).toHaveLength(26);
    expect(DIGITS).toHaveLength(10);
    expect(uniqueChars(DEFAULT_SYMBOLS)).toBe(DEFAULT_SYMBOLS);
  });

  it('default symbols contain no letters, digits, spaces or quotes', () => {
    expect(DEFAULT_SYMBOLS).not.toMatch(/[A-Za-z0-9\s'"`\\]/);
  });

  it('uniqueChars removes duplicates and keeps order', () => {
    expect(uniqueChars('aabbcab')).toBe('abc');
  });

  it('withoutChars removes the excluded characters', () => {
    expect(withoutChars('abcdef', 'bdf')).toBe('ace');
    expect(withoutChars(UPPERCASE + DIGITS, AMBIGUOUS)).not.toMatch(/[IO01]/);
  });

  it('sanitizeSymbols keeps only printable ASCII punctuation', () => {
    expect(sanitizeSymbols('a!b@ 1#\t$é€$')).toBe('!@#$');
    expect(sanitizeSymbols('')).toBe('');
  });
});
