import { computed, ref, watch } from 'vue';
import { generatePassphrase, passphraseEntropy } from '../lib/passphrase.js';
import { generatePassword, passwordEntropy } from '../lib/password.js';
import { rateStrength } from '../lib/strength.js';

/**
 * Generates a new secret whenever the relevant settings change.
 *
 * @param {import('vue').Ref<import('../lib/settings.js').Settings | null>} settings Reactive settings.
 * @returns {{
 *   secret: import('vue').Ref<string>,
 *   entropy: import('vue').ComputedRef<number>,
 *   strength: import('vue').ComputedRef<import('../lib/strength.js').Strength>,
 *   regenerate: () => void,
 * }} Generator state.
 */
export function useGenerator(settings) {
  const secret = ref('');

  /** Generates a fresh secret from the current settings. */
  function regenerate() {
    const s = settings.value;
    if (s === null) {
      return;
    }
    secret.value = s.mode === 'passphrase' ? generatePassphrase(s.passphrase) : generatePassword(s.password);
  }

  const entropy = computed(() => {
    const s = settings.value;
    if (s === null) {
      return 0;
    }
    return s.mode === 'passphrase' ? passphraseEntropy(s.passphrase) : passwordEntropy(s.password);
  });

  const strength = computed(() => rateStrength(entropy.value));

  watch(
    () => {
      const s = settings.value;
      return s === null ? null : JSON.stringify([s.mode, s.mode === 'passphrase' ? s.passphrase : s.password]);
    },
    regenerate,
    { immediate: true },
  );

  return { secret, entropy, strength, regenerate };
}
