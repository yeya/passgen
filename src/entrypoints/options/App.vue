<script setup>
import { ref, watch } from 'vue';
import { browser } from 'wxt/browser';
import { useSettings } from '../../composables/useSettings.js';
import { DEFAULT_SYMBOLS, sanitizeSymbols } from '../../lib/charsets.js';
import { checkedOf } from '../../lib/dom.js';
import { clearHistory } from '../../lib/history.js';
import { t } from '../../lib/i18n.js';
import { defaultSettings } from '../../lib/settings.js';

/** Public asset path; bound dynamically so the bundler does not try to import it. */
const LOGO_URL = '/icon/48.png';

const { settings } = useSettings();
const shortcut = ref('');
const symbolDraft = ref('');

browser.commands
  ?.getAll()
  .then((commands) => {
    shortcut.value = commands.find((c) => c.name === '_execute_action')?.shortcut ?? '';
  })
  .catch(() => {
    shortcut.value = '';
  });

watch(
  () => settings.value?.password.symbolSet,
  (value) => {
    symbolDraft.value = value ?? '';
  },
  { immediate: true },
);

/**
 * @param {Event} event Change event from the history checkbox.
 */
async function onHistoryToggle(event) {
  if (settings.value === null) {
    return;
  }
  const enabled = checkedOf(event);
  settings.value.historyEnabled = enabled;
  if (!enabled) {
    await clearHistory();
  }
}

/** Saves the edited symbol set, or restores it if nothing valid remains. */
function commitSymbols() {
  if (settings.value === null) {
    return;
  }
  const clean = sanitizeSymbols(symbolDraft.value);
  if (clean.length > 0) {
    settings.value.password.symbolSet = clean;
  }
  symbolDraft.value = settings.value.password.symbolSet;
}

/** Restores the default symbol set. */
function resetSymbols() {
  if (settings.value !== null) {
    settings.value.password.symbolSet = DEFAULT_SYMBOLS;
  }
}

/** Restores every setting to its default and erases the history. */
async function resetAll() {
  settings.value = defaultSettings();
  await clearHistory();
}
</script>

<template>
  <main v-if="settings" class="page">
    <header>
      <img :src="LOGO_URL" alt="" width="40" height="40" />
      <div>
        <h1>{{ t('settingsTitle') }}</h1>
        <p class="help">{{ t('settingsSaved') }}</p>
        <p class="help">{{ t('settingsSynced') }}</p>
      </div>
    </header>

    <section>
      <h2>{{ t('sectionHistory') }}</h2>
      <label class="check">
        <input
          type="checkbox"
          data-testid="history-enabled"
          :checked="settings.historyEnabled"
          @change="onHistoryToggle"
        />
        {{ t('historyEnable') }}
      </label>
      <p class="help">{{ t('historyHelp') }}</p>
      <p v-if="settings.historyEnabled" class="warning" role="alert" data-testid="history-not-synced">
        {{ t('historyNotSynced') }}
      </p>
    </section>

    <section>
      <h2>{{ t('sectionSymbols') }}</h2>
      <label class="field-label" for="symbol-set">{{ t('symbolSet') }}</label>
      <div class="inline">
        <input
          id="symbol-set"
          v-model="symbolDraft"
          class="text"
          type="text"
          dir="ltr"
          spellcheck="false"
          autocomplete="off"
          data-testid="symbol-set"
          @change="commitSymbols"
        />
        <button type="button" class="btn" data-testid="reset-symbols" @click="resetSymbols">
          {{ t('resetSymbols') }}
        </button>
      </div>
      <p class="help">{{ t('symbolSetHelp') }}</p>
    </section>

    <section>
      <h2>{{ t('sectionShortcut') }}</h2>
      <p data-testid="shortcut">
        {{ shortcut ? t('shortcutCurrent', shortcut) : t('shortcutNone') }}
      </p>
      <p class="help">{{ t('shortcutHelp') }}</p>
    </section>

    <section>
      <h2>{{ t('sectionReset') }}</h2>
      <button type="button" class="btn" data-testid="reset-all" @click="resetAll">{{ t('resetAll') }}</button>
    </section>

    <footer class="help">{{ t('privacyNote') }}</footer>
  </main>
</template>

<style scoped>
.page {
  max-inline-size: 640px;
  margin: 0 auto;
  padding: 32px 20px;
  display: grid;
  gap: 24px;
}

header {
  display: flex;
  gap: 14px;
  align-items: center;
}

h1 {
  font-size: 22px;
  margin: 0;
}

h2 {
  font-size: 15px;
  margin: 0 0 8px;
}

section {
  display: grid;
  gap: 6px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

section > * {
  margin: 0;
}

section > .btn,
section > select {
  justify-self: start;
}

select,
.text {
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  max-inline-size: 100%;
}

.warning {
  padding: 8px 10px;
  border-inline-start: 4px solid var(--s2);
  border-radius: 4px;
  background: color-mix(in srgb, var(--s2) 15%, transparent);
}

.inline {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.text {
  flex: 1;
  min-inline-size: 200px;
  font-family: var(--mono);
}
</style>
