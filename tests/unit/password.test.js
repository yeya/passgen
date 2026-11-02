import { describe, expect, it } from 'vitest';
import { AMBIGUOUS, DEFAULT_SYMBOLS } from '../../src/lib/charsets.js';
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  characterClasses,
  generatePassword,
  log2BigInt,
  passwordEntropy,
} from '../../src/lib/password.js';

/** @type {import('../../src/lib/password.js').PasswordOptions} */
const ALL = {
  length: 20,
  lowercase: true,
  uppercase: true,
  digits: true,
  symbols: true,
  excludeAmbiguous: false,
  symbolSet: DEFAULT_SYMBOLS,
};

describe('generatePassword', () => {
  it('returns the requested length', () => {
    for (const length of [MIN_PASSWORD_LENGTH, 8, 20, 64, MAX_PASSWORD_LENGTH]) {
      expect(generatePassword({ ...ALL, length })).toHaveLength(length);
    }
  });

  it('always contains every enabled character class', () => {
    for (let i = 0; i < 500; i += 1) {
      const pw = generatePassword({ ...ALL, length: MIN_PASSWORD_LENGTH });
      expect(pw).toMatch(/[a-z]/);
      expect(pw).toMatch(/[A-Z]/);
      expect(pw).toMatch(/[0-9]/);
      expect(pw).toMatch(/[^A-Za-z0-9]/);
    }
  });

  it('only uses enabled classes', () => {
    const digitsOnly = { ...ALL, lowercase: false, uppercase: false, symbols: false };
    expect(generatePassword(digitsOnly)).toMatch(/^[0-9]{20}$/);
    const lettersOnly = { ...ALL, digits: false, symbols: false };
    expect(generatePassword(lettersOnly)).toMatch(/^[A-Za-z]{20}$/);
  });

  it('excludes ambiguous characters when asked', () => {
    const options = { ...ALL, length: 128, excludeAmbiguous: true };
    for (let i = 0; i < 50; i += 1) {
      const pw = generatePassword(options);
      for (const c of AMBIGUOUS) {
        expect(pw).not.toContain(c);
      }
    }
  });

  it('uses only the custom symbol set', () => {
    const options = { ...ALL, lowercase: false, uppercase: false, digits: false, symbolSet: '#$' };
    expect(generatePassword(options)).toMatch(/^[#$]{20}$/);
  });

  it('drops a class that becomes empty after exclusions', () => {
    const options = {
      ...ALL,
      lowercase: false,
      uppercase: false,
      digits: true,
      symbolSet: '|',
      excludeAmbiguous: true,
    };
    expect(characterClasses(options)).toEqual(['23456789']);
    expect(generatePassword(options)).toMatch(/^[2-9]{20}$/);
  });

  it.each([MIN_PASSWORD_LENGTH - 1, MAX_PASSWORD_LENGTH + 1, 10.5, Number.NaN])('rejects length %s', (length) => {
    expect(() => generatePassword({ ...ALL, length })).toThrow(RangeError);
  });

  it('rejects options with no characters', () => {
    expect(() =>
      generatePassword({ ...ALL, lowercase: false, uppercase: false, digits: false, symbols: false }),
    ).toThrow(RangeError);
  });

  it('distributes characters uniformly', () => {
    const options = { ...ALL, lowercase: false, uppercase: false, symbols: false, length: 100 };
    const counts = Array(10).fill(0);
    for (let i = 0; i < 500; i += 1) {
      for (const c of generatePassword(options)) {
        counts[Number(c)] += 1;
      }
    }
    const expected = 5000;
    const chi = counts.reduce((sum, c) => sum + (c - expected) ** 2 / expected, 0);
    expect(chi).toBeLessThan(27.88); // 9 dof, p = 0.001
  });

  it('produces distinct passwords', () => {
    const seen = new Set(Array.from({ length: 1000 }, () => generatePassword(ALL)));
    expect(seen.size).toBe(1000);
  });
});

describe('passwordEntropy', () => {
  it('equals length * log2(pool) for a single class', () => {
    const options = { ...ALL, uppercase: false, digits: false, symbols: false, length: 10 };
    expect(passwordEntropy(options)).toBeCloseTo(10 * Math.log2(26), 6);
  });

  it('matches a brute-force count for a small case', () => {
    // Pool: 10 digits + 2 symbols, length 3, at least one of each.
    const options = { ...ALL, lowercase: false, uppercase: false, symbolSet: '#$', length: 3 };
    const pool = '0123456789#$';
    let count = 0;
    for (const a of pool) {
      for (const b of pool) {
        for (const c of pool) {
          const s = a + b + c;
          if (/[0-9]/.test(s) && /[#$]/.test(s)) {
            count += 1;
          }
        }
      }
    }
    expect(passwordEntropy(options)).toBeCloseTo(Math.log2(count), 10);
  });

  it('is slightly below the naive estimate when classes are required', () => {
    const naive = 20 * Math.log2(26 + 26 + 10 + DEFAULT_SYMBOLS.length);
    const exact = passwordEntropy(ALL);
    expect(exact).toBeLessThan(naive);
    expect(exact).toBeGreaterThan(naive - 1);
  });

  it('handles very long passwords without overflowing', () => {
    const bits = passwordEntropy({ ...ALL, length: MAX_PASSWORD_LENGTH });
    expect(Number.isFinite(bits)).toBe(true);
    expect(bits).toBeGreaterThan(800);
  });

  it('returns 0 when nothing can be generated', () => {
    expect(passwordEntropy({ ...ALL, lowercase: false, uppercase: false, digits: false, symbols: false })).toBe(0);
    expect(passwordEntropy({ ...ALL, length: 0 })).toBe(0);
  });
});

describe('log2BigInt', () => {
  it('computes log2 of small and huge values', () => {
    expect(log2BigInt(1n)).toBe(0);
    expect(log2BigInt(1024n)).toBeCloseTo(10, 10);
    expect(log2BigInt(2n ** 1000n)).toBeCloseTo(1000, 6);
    expect(log2BigInt(0n)).toBe(0);
    expect(log2BigInt(-5n)).toBe(0);
  });
});
