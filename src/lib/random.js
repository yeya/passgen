/**
 * Cryptographically secure random helpers.
 *
 * Everything here is built on `crypto.getRandomValues`, which is available in
 * every extension context (popup, options page, service worker) and in Node.
 * `Math.random` is never used.
 */

const UINT32_RANGE = 2 ** 32;

/**
 * Returns a uniformly distributed random integer in `[0, maxExclusive)`.
 *
 * Uses rejection sampling so there is no modulo bias: values from the top,
 * incomplete "bucket" of the 32-bit range are thrown away and redrawn.
 *
 * @param {number} maxExclusive Upper bound (exclusive). Integer in `[1, 2^32]`.
 * @returns {number} The random integer.
 */
export function randomInt(maxExclusive) {
  if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > UINT32_RANGE) {
    throw new RangeError(`maxExclusive must be an integer in [1, 2^32], got ${maxExclusive}`);
  }
  const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive);
  const buffer = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buffer);
    const value = buffer[0];
    if (value < limit) {
      return value % maxExclusive;
    }
  }
}

/**
 * Picks a uniformly random element of a non-empty array or string.
 *
 * @template T
 * @param {ArrayLike<T>} items Items to choose from.
 * @returns {T} The chosen item.
 */
export function randomItem(items) {
  if (items.length === 0) {
    throw new RangeError('Cannot pick from an empty collection');
  }
  return items[randomInt(items.length)];
}

/**
 * Shuffles an array in place with an unbiased Fisher–Yates shuffle.
 *
 * @template T
 * @param {T[]} items Array to shuffle. It is mutated.
 * @returns {T[]} The same array, for chaining.
 */
export function shuffle(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
  return items;
}
