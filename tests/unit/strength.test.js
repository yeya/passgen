import { describe, expect, it } from 'vitest';
import { rateStrength } from '../../src/lib/strength.js';

describe('rateStrength', () => {
  it.each([
    [0, 0, 'veryWeak'],
    [34.9, 0, 'veryWeak'],
    [35, 1, 'weak'],
    [50, 2, 'fair'],
    [70, 3, 'strong'],
    [89.9, 3, 'strong'],
    [90, 4, 'veryStrong'],
    [1000, 4, 'veryStrong'],
  ])('%s bits → %s (%s)', (bits, score, key) => {
    expect(rateStrength(bits)).toEqual({ score, key });
  });

  it('treats negative or NaN input as very weak', () => {
    expect(rateStrength(-1).key).toBe('veryWeak');
    expect(rateStrength(Number.NaN).key).toBe('veryWeak');
  });
});
