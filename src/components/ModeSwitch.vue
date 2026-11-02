<script setup>
import { useTemplateRef } from 'vue';
import { t } from '../lib/i18n.js';

/** @type {import('vue').ModelRef<'password' | 'passphrase'>} */
const mode = defineModel({ type: String, required: true });

const modes = /** @type {const} */ (['password', 'passphrase']);
const buttons = useTemplateRef('buttons');

/**
 * Arrow-key navigation between the two options (WAI-ARIA radio group pattern).
 *
 * @param {KeyboardEvent} event Key event.
 */
function onKeydown(event) {
  const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
  if (!keys.includes(event.key)) {
    return;
  }
  event.preventDefault();
  const index = modes.indexOf(/** @type {'password' | 'passphrase'} */ (mode.value));
  const next = modes[(index + 1) % modes.length];
  mode.value = next;
  buttons.value?.[modes.indexOf(next)]?.focus();
}
</script>

<template>
  <div class="switch" role="radiogroup" :aria-label="t('modeLabel')" @keydown="onKeydown">
    <button
      v-for="m in modes"
      ref="buttons"
      :key="m"
      type="button"
      role="radio"
      :data-testid="`mode-${m}`"
      :aria-checked="mode === m"
      :tabindex="mode === m ? 0 : -1"
      @click="mode = m"
    >
      {{ t(m === 'password' ? 'modePassword' : 'modePassphrase') }}
    </button>
  </div>
</template>

<style scoped>
.switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 3px;
  border-radius: var(--radius);
  background: var(--surface);
  border: 1px solid var(--border);
}

button {
  border: 0;
  border-radius: 6px;
  padding: 6px;
  background: none;
  color: var(--muted);
  font-weight: 600;
}

button[aria-checked='true'] {
  background: var(--bg);
  color: var(--text);
  box-shadow: 0 1px 2px rgb(0 0 0 / 15%);
}
</style>
