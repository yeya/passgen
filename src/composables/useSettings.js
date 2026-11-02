import { onScopeDispose, ref, watch } from 'vue';
import { loadSettings, saveSettings, watchSettings } from '../lib/settings.js';

/**
 * Reactive, persisted settings. Changes are saved automatically, and changes
 * made elsewhere (for example on the options page) are picked up live.
 *
 * @returns {{ settings: import('vue').Ref<import('../lib/settings.js').Settings | null>, ready: Promise<void> }}
 *   `settings` is `null` until loaded; `ready` resolves once loaded.
 */
export function useSettings() {
  /** @type {import('vue').Ref<import('../lib/settings.js').Settings | null>} */
  const settings = ref(null);
  let lastSaved = '';

  const ready = loadSettings().then((loaded) => {
    lastSaved = JSON.stringify(loaded);
    settings.value = loaded;
  });

  watch(
    settings,
    async (value) => {
      if (value === null) {
        return;
      }
      const serialized = JSON.stringify(value);
      if (serialized === lastSaved) {
        return;
      }
      lastSaved = serialized;
      await saveSettings(structuredClone(JSON.parse(serialized)));
    },
    { deep: true },
  );

  const unwatch = watchSettings((value) => {
    const serialized = JSON.stringify(value);
    if (serialized !== lastSaved) {
      lastSaved = serialized;
      settings.value = value;
    }
  });
  onScopeDispose(unwatch);

  return { settings, ready };
}
