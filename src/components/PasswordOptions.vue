<script setup>
import { computed } from 'vue';
import { checkedOf, valueOf } from '../lib/dom.js';
import { t } from '../lib/i18n.js';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '../lib/password.js';

/** @type {import('vue').ModelRef<import('../lib/password.js').PasswordOptions>} */
const options = defineModel({ type: Object, required: true });

const sets = /** @type {const} */ ([
  { key: 'uppercase', label: 'uppercase' },
  { key: 'lowercase', label: 'lowercase' },
  { key: 'digits', label: 'digits' },
  { key: 'symbols', label: 'symbols' },
]);

const enabledCount = computed(() => sets.filter((set) => options.value[set.key]).length);

/**
 * Replaces one option, keeping the model immutable from the child's side.
 *
 * @param {keyof import('../lib/password.js').PasswordOptions} key Option name.
 * @param {unknown} value New value.
 */
function update(key, value) {
  options.value = { ...options.value, [key]: value };
}

/**
 * @param {Event} event Input event from the slider or number field.
 */
function onLength(event) {
  const value = Number(valueOf(event));
  if (Number.isFinite(value)) {
    update('length', Math.min(MAX_PASSWORD_LENGTH, Math.max(MIN_PASSWORD_LENGTH, Math.round(value))));
  }
}
</script>

<template>
  <fieldset class="options">
    <legend class="visually-hidden">{{ t('modePassword') }}</legend>
    <div class="length">
      <label class="field-label" for="pw-length">{{ t('length') }}</label>
      <input
        id="pw-length-range"
        type="range"
        :min="MIN_PASSWORD_LENGTH"
        :max="64"
        :value="Math.min(options.length, 64)"
        :aria-label="t('length')"
        data-testid="length-range"
        @input="onLength"
      />
      <input
        id="pw-length"
        class="number"
        type="number"
        inputmode="numeric"
        :min="MIN_PASSWORD_LENGTH"
        :max="MAX_PASSWORD_LENGTH"
        :value="options.length"
        data-testid="length-input"
        @change="onLength"
      />
    </div>
    <div class="sets">
      <label v-for="set in sets" :key="set.key" class="check">
        <input
          type="checkbox"
          :data-testid="`set-${set.key}`"
          :checked="options[set.key]"
          :disabled="options[set.key] && enabledCount === 1"
          @change="update(set.key, checkedOf($event))"
        />
        {{ t(set.label) }}
      </label>
    </div>
    <label class="check">
      <input
        type="checkbox"
        data-testid="exclude-ambiguous"
        :checked="options.excludeAmbiguous"
        @change="update('excludeAmbiguous', checkedOf($event))"
      />
      {{ t('excludeAmbiguous') }}
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

.length {
  display: grid;
  grid-template-columns: auto 1fr 64px;
  align-items: center;
  gap: 10px;
}

input[type='range'] {
  accent-color: var(--accent);
  inline-size: 100%;
}

.number {
  inline-size: 64px;
  padding: 4px 6px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  text-align: center;
}

.sets {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
</style>
