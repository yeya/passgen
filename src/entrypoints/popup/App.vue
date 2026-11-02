<script setup>
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue';
import { browser } from 'wxt/browser';
import AppIcon from '../../components/AppIcon.vue';
import HistoryList from '../../components/HistoryList.vue';
import ModeSwitch from '../../components/ModeSwitch.vue';
import PassphraseOptions from '../../components/PassphraseOptions.vue';
import PasswordOptions from '../../components/PasswordOptions.vue';
import SecretDisplay from '../../components/SecretDisplay.vue';
import StrengthMeter from '../../components/StrengthMeter.vue';
import { useGenerator } from '../../composables/useGenerator.js';
import { useSettings } from '../../composables/useSettings.js';
import { copyText } from '../../lib/clipboard.js';
import { addToHistory, clearHistory, getHistory } from '../../lib/history.js';
import { t } from '../../lib/i18n.js';

/** Public asset path; bound dynamically so the bundler does not try to import it. */
const LOGO_URL = '/icon/32.png';

const { settings, ready } = useSettings();
const { secret, entropy, regenerate } = useGenerator(settings);

/** @type {import('vue').Ref<import('../../lib/history.js').HistoryEntry[]>} */
const history = ref([]);
/** @type {import('vue').Ref<'idle' | 'copied' | 'failed'>} */
const copyState = ref('idle');
const announcement = computed(() => {
  if (copyState.value === 'copied') {
    return t('copied');
  }
  return copyState.value === 'failed' ? t('copyFailed') : '';
});
const copyButton = useTemplateRef('copyButton');
/** @type {ReturnType<typeof setTimeout> | undefined} */
let copiedTimer;

ready.then(async () => {
  if (settings.value?.historyEnabled) {
    history.value = await getHistory();
  }
  // Focus "Copy" so the keyboard flow is: shortcut → Enter → paste.
  await nextTick();
  copyButton.value?.focus();
});

watch(
  () => settings.value?.historyEnabled,
  async (enabled) => {
    history.value = enabled ? await getHistory() : [];
  },
);

watch(secret, () => {
  copyState.value = 'idle';
});

/**
 * Shows a copy result on the button for a moment.
 *
 * @param {'copied' | 'failed'} state Result to show.
 */
function flashCopyState(state) {
  copyState.value = state;
  clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => {
    copyState.value = 'idle';
  }, 1500);
}

/**
 * Copies a secret and, when enabled, records it in the history.
 *
 * @param {string} value Secret to copy.
 * @returns {Promise<void>}
 */
async function copy(value) {
  const s = settings.value;
  if (s === null || value === '') {
    return;
  }
  try {
    await copyText(value);
  } catch {
    flashCopyState('failed');
    return;
  }
  flashCopyState('copied');
  if (s.historyEnabled) {
    history.value = await addToHistory({ value, mode: s.mode, createdAt: Date.now() });
  }
}

/** Deletes the history. */
async function onClearHistory() {
  await clearHistory();
  history.value = [];
}

/** Opens the options page. */
function openSettings() {
  browser.runtime.openOptionsPage();
}

onBeforeUnmount(() => clearTimeout(copiedTimer));
</script>

<template>
  <main v-if="settings" class="popup">
    <header>
      <h1><img :src="LOGO_URL" alt="" width="20" height="20" />PassGen</h1>
      <button
        type="button"
        class="btn btn-icon"
        :title="t('openSettings')"
        :aria-label="t('openSettings')"
        data-testid="open-settings"
        @click="openSettings"
      >
        <AppIcon name="settings" />
      </button>
    </header>

    <ModeSwitch v-model="settings.mode" />

    <SecretDisplay :value="secret" />

    <div class="actions">
      <StrengthMeter :bits="entropy" />
      <div class="buttons">
        <button
          type="button"
          class="btn btn-icon"
          :title="t('regenerate')"
          :aria-label="t('regenerate')"
          data-testid="regenerate"
          @click="regenerate"
        >
          <AppIcon name="refresh" />
        </button>
        <button
          ref="copyButton"
          type="button"
          class="btn btn-primary"
          data-testid="copy"
          :class="{ failed: copyState === 'failed' }"
          :data-state="copyState"
          @click="copy(secret)"
        >
          <AppIcon :name="copyState === 'copied' ? 'check' : 'copy'" />
          <!-- All labels share one grid cell so the button keeps the width of the longest one. -->
          <span class="label-stack">
            <span :class="{ invisible: copyState !== 'idle' }">{{ t('copy') }}</span>
            <span :class="{ invisible: copyState !== 'copied' }">{{ t('copied') }}</span>
            <span :class="{ invisible: copyState !== 'failed' }">{{ t('copyFailedShort') }}</span>
          </span>
        </button>
      </div>
    </div>

    <!-- Screen-reader announcement only; takes no space, so the popup never changes height. -->
    <p class="visually-hidden" role="status" data-testid="status">
      {{ announcement }}
    </p>

    <PasswordOptions v-if="settings.mode === 'password'" v-model="settings.password" />
    <PassphraseOptions v-else v-model="settings.passphrase" />

    <HistoryList v-if="settings.historyEnabled" :entries="history" @copy="copy" @clear="onClearHistory" />
  </main>
</template>

<style scoped>
.popup {
  inline-size: 360px;
  padding: 14px;
  display: grid;
  gap: 12px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h1 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 16px;
}

.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.buttons {
  display: flex;
  gap: 6px;
}

.label-stack {
  display: grid;
}

.label-stack > span {
  grid-area: 1 / 1;
  text-align: center;
}

.invisible {
  visibility: hidden;
}

.btn-primary.failed {
  background: var(--danger);
  border-color: var(--danger);
}
</style>
