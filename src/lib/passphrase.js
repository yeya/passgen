/**
 * Diceware-style passphrase generation using the EFF large word list
 * (7,776 words, about 12.9 bits of entropy per word).
 *
 * Word list: https://www.eff.org/dice — CC BY 3.0 US, Electronic Frontier Foundation.
 */

import rawWordList from './wordlists/eff-large-words.txt?raw';
import { DIGITS } from './charsets.js';
import { randomInt } from './random.js';

/** The EFF large word list, one word per entry. */
export const WORDS = Object.freeze(
  rawWordList
    .split('\n')
    .map((line) => line.trim())
    .filter((word) => word.length > 0),
);

export const MIN_WORDS = 3;
export const MAX_WORDS = 20;
/** Separators offered in the UI. An empty separator is not allowed: it would make word boundaries ambiguous and lower the entropy. */
export const SEPARATORS = Object.freeze(['-', '.', '_', ' ', ',']);

/**
 * @typedef {object} PassphraseOptions
 * @property {number} words Number of words.
 * @property {string} separator String placed between words. One of {@link SEPARATORS}.
 * @property {boolean} capitalize Capitalize the first letter of each word.
 * @property {boolean} includeNumber Append one random digit to one random word.
 */

/**
 * Generates a random passphrase.
 *
 * @param {PassphraseOptions} options Generator options.
 * @returns {string} The passphrase.
 * @throws {RangeError} When the word count or separator is invalid.
 */
export function generatePassphrase(options) {
  const { words: count, separator, capitalize, includeNumber } = options;
  if (!Number.isInteger(count) || count < MIN_WORDS || count > MAX_WORDS) {
    throw new RangeError(`Word count must be between ${MIN_WORDS} and ${MAX_WORDS}`);
  }
  if (!SEPARATORS.includes(separator)) {
    throw new RangeError(`Unsupported separator: ${JSON.stringify(separator)}`);
  }
  const words = Array.from({ length: count }, () => {
    const word = WORDS[randomInt(WORDS.length)];
    return capitalize ? word.charAt(0).toUpperCase() + word.slice(1) : word;
  });
  if (includeNumber) {
    const index = randomInt(count);
    words[index] += DIGITS[randomInt(DIGITS.length)];
  }
  return words.join(separator);
}

/**
 * Entropy, in bits, of a passphrase produced by {@link generatePassphrase}.
 *
 * @param {PassphraseOptions} options Generator options.
 * @returns {number} Entropy in bits.
 */
export function passphraseEntropy(options) {
  if (!Number.isInteger(options.words) || options.words < 1) {
    return 0;
  }
  let bits = options.words * Math.log2(WORDS.length);
  if (options.includeNumber) {
    bits += Math.log2(DIGITS.length) + Math.log2(options.words);
  }
  return bits;
}
