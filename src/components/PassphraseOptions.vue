<script setup>
import { checkedOf, valueOf } from '../lib/dom.js';
import { t } from '../lib/i18n.js';
import { MAX_WORDS, MIN_WORDS } from '../lib/passphrase.js';

/** @type {import('vue').ModelRef<import('../lib/passphrase.js').PassphraseOptions>} */
const options = defineModel({ type: Object, required: true });

const separators = [
  { value: '-', label: 'separatorHyphen' },
  { value: '.', label: 'separatorPeriod' },
  { value: '_', label: 'separatorUnderscore' },
  { value: ' ', label: 'separatorSpace' },
  { value: ',', label: 'separatorComma' },
];

/**
 * @param {keyof import('../lib/passphrase.js').PassphraseOptions} key Option name.
 * @param {unknown} value New value.
 */
function update(key, value) {
  options.value = { ...options.value, [key]: value };
}

/**
 * @param {Event} event Input event from the slider or number field.
 */
function onWords(event) {
  const value = Number(valueOf(event));
  if (Number.isFinite(value)) {
    update('words', Math.min(MAX_WORDS, Math.max(MIN_WORDS, Math.round(value))));
  }
}
</script>

<template>
  <fieldset class="options">
    <legend class="visually-hidden">{{ t('modePassphrase') }}</legend>
    <div class="row">
      <label class="field-label" for="pp-words">{{ t('words') }}</label>
      <input
        type="range"
        :min="MIN_WORDS"
        :max="MAX_WORDS"
        :value="options.words"
        :aria-label="t('words')"
        data-testid="words-range"
        @input="onWords"
      />
      <input
        id="pp-words"
        class="number"
        type="number"
        inputmode="numeric"
        :min="MIN_WORDS"
        :max="MAX_WORDS"
        :value="options.words"
        data-testid="words-input"
        @change="onWords"
      />
    </div>
    <div class="row separator">
      <label class="field-label" for="pp-separator">{{ t('separator') }}</label>
      <select
        id="pp-separator"
        data-testid="separator"
        :value="options.separator"
        @change="update('separator', valueOf($event))"
      >
        <option v-for="s in separators" :key="s.label" :value="s.value">{{ t(s.label) }}</option>
      </select>
    </div>
    <label class="check">
      <input
        type="checkbox"
        data-testid="capitalize"
        :checked="options.capitalize"
        @change="update('capitalize', checkedOf($event))"
      />
      {{ t('capitalize') }}
    </label>
    <label class="check">
      <input
        type="checkbox"
        data-testid="include-number"
        :checked="options.includeNumber"
        @change="update('includeNumber', checkedOf($event))"
      />
      {{ t('includeNumber') }}
    </label>
  </fieldset>
</template>

<style scoped>
.options {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  border: 0;
}

.row {
  display: grid;
  grid-template-columns: auto 1fr 64px;
  align-items: center;
  gap: 10px;
}

.separator {
  grid-template-columns: auto 1fr;
}

input[type='range'] {
  accent-color: var(--accent);
  inline-size: 100%;
}

.number,
select {
  padding: 4px 6px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
}

.number {
  inline-size: 64px;
  text-align: center;
}
</style>
