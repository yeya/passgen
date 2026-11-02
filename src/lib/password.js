/**
 * Random password generation.
 *
 * Passwords are drawn uniformly from all strings of the requested length over
 * the combined character pool, and redrawn until every enabled character class
 * appears at least once (rejection sampling). This keeps the result uniformly
 * distributed over *valid* passwords, so the entropy reported by
 * {@link passwordEntropy} is exact rather than an estimate.
 */

import { AMBIGUOUS, DIGITS, LOWERCASE, UPPERCASE, sanitizeSymbols, withoutChars } from './charsets.js';
import { randomInt } from './random.js';

export const MIN_PASSWORD_LENGTH = 4;
export const MAX_PASSWORD_LENGTH = 128;

/**
 * @typedef {object} PasswordOptions
 * @property {number} length Number of characters.
 * @property {boolean} lowercase Include `a-z`.
 * @property {boolean} uppercase Include `A-Z`.
 * @property {boolean} digits Include `0-9`.
 * @property {boolean} symbols Include the characters from `symbolSet`.
 * @property {boolean} excludeAmbiguous Leave out look-alike characters such as `I l 1 O 0`.
 * @property {string} symbolSet Symbol characters to use when `symbols` is on.
 */

/**
 * Builds the list of non-empty character classes for the given options.
 *
 * @param {PasswordOptions} options Generator options.
 * @returns {string[]} One string per enabled class, each with unique characters.
 */
export function characterClasses(options) {
  const excluded = options.excludeAmbiguous ? AMBIGUOUS : '';
  /** @type {string[]} */
  const classes = [];
  if (options.lowercase) {
    classes.push(LOWERCASE);
  }
  if (options.uppercase) {
    classes.push(UPPERCASE);
  }
  if (options.digits) {
    classes.push(DIGITS);
  }
  if (options.symbols) {
    classes.push(sanitizeSymbols(options.symbolSet));
  }
  return classes.map((set) => withoutChars(set, excluded)).filter((set) => set.length > 0);
}

/**
 * Generates a random password.
 *
 * @param {PasswordOptions} options Generator options.
 * @returns {string} The password.
 * @throws {RangeError} When the length is out of range or no characters are enabled.
 */
export function generatePassword(options) {
  const { length } = options;
  if (!Number.isInteger(length) || length < MIN_PASSWORD_LENGTH || length > MAX_PASSWORD_LENGTH) {
    throw new RangeError(`Password length must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH}`);
  }
  const classes = characterClasses(options);
  if (classes.length === 0) {
    throw new RangeError('At least one character set must be enabled');
  }
  const pool = classes.join('');

  // With 4 classes and the minimum length the acceptance rate is still above
  // 5%, so this loop finishes after a handful of rounds in practice.
  for (;;) {
    let candidate = '';
    for (let i = 0; i < length; i += 1) {
      candidate += pool[randomInt(pool.length)];
    }
    if (classes.every((set) => [...candidate].some((c) => set.includes(c)))) {
      return candidate;
    }
  }
}

/**
 * Exact entropy, in bits, of a password produced by {@link generatePassword}.
 *
 * Counts the passwords that contain at least one character of every class
 * using inclusion–exclusion, then takes `log2` of that count.
 *
 * @param {PasswordOptions} options Generator options.
 * @returns {number} Entropy in bits, or 0 when nothing can be generated.
 */
export function passwordEntropy(options) {
  const classes = characterClasses(options);
  if (classes.length === 0 || !Number.isInteger(options.length) || options.length < 1) {
    return 0;
  }
  const sizes = classes.map((set) => set.length);
  const total = sizes.reduce((a, b) => a + b, 0);
  const exponent = BigInt(options.length);
  let count = 0n;
  for (let mask = 0; mask < 1 << sizes.length; mask += 1) {
    let missing = 0;
    let bits = 0;
    sizes.forEach((size, i) => {
      if (mask & (1 << i)) {
        missing += size;
        bits += 1;
      }
    });
    const term = BigInt(total - missing) ** exponent;
    count += bits % 2 === 0 ? term : -term;
  }
  return log2BigInt(count);
}

/**
 * `log2` for arbitrarily large positive BigInts.
 *
 * @param {bigint} value Positive integer.
 * @returns {number} `log2(value)`, or 0 for non-positive input.
 */
export function log2BigInt(value) {
  if (value <= 0n) {
    return 0;
  }
  const bitLength = value.toString(2).length;
  const shift = Math.max(0, bitLength - 53);
  return Math.log2(Number(value >> BigInt(shift))) + shift;
}
