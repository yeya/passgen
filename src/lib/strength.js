/**
 * Maps entropy to a human-friendly strength rating.
 */

/**
 * @typedef {'veryWeak' | 'weak' | 'fair' | 'strong' | 'veryStrong'} StrengthKey
 */

/**
 * @typedef {object} Strength
 * @property {0 | 1 | 2 | 3 | 4} score 0 (very weak) to 4 (very strong).
 * @property {StrengthKey} key Rating name, also used as the i18n message suffix.
 */

/** @type {ReadonlyArray<{ minBits: number, key: StrengthKey }>} */
const LEVELS = Object.freeze([
  { minBits: 90, key: 'veryStrong' },
  { minBits: 70, key: 'strong' },
  { minBits: 50, key: 'fair' },
  { minBits: 35, key: 'weak' },
  { minBits: 0, key: 'veryWeak' },
]);

/**
 * Rates a secret by its entropy.
 *
 * @param {number} bits Entropy in bits.
 * @returns {Strength} The rating.
 */
export function rateStrength(bits) {
  const index = LEVELS.findIndex((level) => bits >= level.minBits);
  const level = LEVELS[index === -1 ? LEVELS.length - 1 : index];
  const score = /** @type {Strength['score']} */ (LEVELS.length - 1 - LEVELS.indexOf(level));
  return { score, key: level.key };
}
