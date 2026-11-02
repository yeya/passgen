/**
 * Character sets used by the password generator.
 */

export const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
export const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const DIGITS = '0123456789';
/** Printable ASCII symbols. Space and quote/backslash characters are left out on purpose: they often break forms and shell scripts. */
export const DEFAULT_SYMBOLS = '!#$%&()*+,-./:;<=>?@[]^_{|}~';
/** Characters that are easy to confuse with each other when read or typed. */
export const AMBIGUOUS = 'Il1|O0o`\'"';

/**
 * Removes duplicate characters, keeping the first occurrence.
 *
 * @param {string} chars Input characters.
 * @returns {string} The characters without duplicates.
 */
export function uniqueChars(chars) {
  return [...new Set(chars)].join('');
}

/**
 * Removes every character in `excluded` from `chars`.
 *
 * @param {string} chars Input characters.
 * @param {string} excluded Characters to remove.
 * @returns {string} The filtered characters.
 */
export function withoutChars(chars, excluded) {
  const blocked = new Set(excluded);
  return [...chars].filter((c) => !blocked.has(c)).join('');
}

/**
 * Normalizes a user-supplied symbol set: keeps only printable, non-alphanumeric
 * ASCII characters (no spaces) and removes duplicates.
 *
 * @param {string} symbols Raw symbols from settings.
 * @returns {string} The cleaned symbol set.
 */
export function sanitizeSymbols(symbols) {
  return uniqueChars([...symbols].filter((c) => /^[!-/:-@[-`{-~]$/.test(c)).join(''));
}
