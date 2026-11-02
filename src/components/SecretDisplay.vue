<script setup>
import { computed } from 'vue';
import { t } from '../lib/i18n.js';

const props = defineProps({
  value: { type: String, required: true },
});

/**
 * Splits the secret into runs of the same character kind so digits and
 * symbols can be colored differently, which makes the secret easier to read.
 */
const segments = computed(() => {
  /** @type {{ kind: 'letter' | 'digit' | 'symbol', text: string }[]} */
  const result = [];
  for (const char of props.value) {
    /** @type {'letter' | 'digit' | 'symbol'} */
    let kind = 'symbol';
    if (/[0-9]/.test(char)) {
      kind = 'digit';
    } else if (/\p{L}/u.test(char)) {
      kind = 'letter';
    }
    const last = result.at(-1);
    if (last && last.kind === kind) {
      last.text += char;
    } else {
      result.push({ kind, text: char });
    }
  }
  return result;
});
</script>

<template>
  <div
    class="secret"
    data-testid="secret"
    :aria-label="t('generatedSecret')"
    role="textbox"
    aria-readonly="true"
    dir="ltr"
    translate="no"
    spellcheck="false"
  >
    <span v-for="(segment, index) in segments" :key="index" :class="segment.kind">{{ segment.text }}</span>
  </div>
</template>

<style scoped>
.secret {
  min-block-size: 64px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  font-family: var(--mono);
  font-size: 17px;
  line-height: 1.5;
  overflow-wrap: anywhere;
  user-select: all;
}

.digit {
  color: var(--digit);
}

.symbol {
  color: var(--symbol);
}
</style>
