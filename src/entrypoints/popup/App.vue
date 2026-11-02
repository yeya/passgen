<script setup>
import { nextTick, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue';
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
import { copyText, requestClipboardClear } from '../../lib/clipboard.js';
import { addToHistory, clearHistory, getHistory } from '../../lib/history.js';
import { t } from '../../lib/i18n.js';

/** Public asset path; bound dynamically so the bundler does not try to import it. */
const LOGO_URL = '/icon/32.png';

const { settings, ready } = useSettings();
const { secret, entropy, regenerate } = useGenerator(settings);

/** @type {import('vue').Ref<import('../../lib/history.js').HistoryEntry[]>} */
const history = ref([]);
const copied = ref(false);
const status = ref('');
const statusIsError = ref(false);
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
  copied.value = false;
});

/**
 * Copies a secret, schedules clipboard clearing and records history.
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
    statusIsError.value = true;
    status.value = t('copyFailed');
    return;
  }
  statusIsError.value = false;
  status.value = s.clipboardClearSeconds > 0 ? t('copiedWillClear', String(s.clipboardClearSeconds)) : t('copied');
  copied.value = value === secret.value;
  clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => {
    copied.value = false;
  }, 1500);

  await Promise.all([
    requestClipboardClear(s.clipboardClearSeconds).catch((error) => {
      console.error('PassGen: could not schedule clipboard clearing', error);
    }),
    s.historyEnabled
      ? addToHistory({ value, mode: s.mode, createdAt: Date.now() }).then((next) => {
          history.value = next;
        })
      : Promise.resolve(),
  ]);
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
          :data-copied="copied"
          @click="copy(secret)"
        >
          <AppIcon :name="copied ? 'check' : 'copy'" />
          <!-- Both labels share one grid cell so the button keeps the width of the longer one. -->
          <span class="label-stack">
            <span :class="{ invisible: copied }">{{ t('copy') }}</span>
            <span :class="{ invisible: !copied }">{{ t('copied') }}</span>
          </span>
        </button>
      </div>
    </div>

    <p class="status" :class="{ error: statusIsError }" role="status" data-testid="status">{{ status }}</p>

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

.status {
  margin: -6px 0 0;
  min-block-size: 1.2em;
  font-size: 12px;
  color: var(--muted);
}

.status.error {
  color: var(--danger);
}
</style>
