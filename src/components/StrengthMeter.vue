<script setup>
import { computed } from 'vue';
import { t } from '../lib/i18n.js';
import { rateStrength } from '../lib/strength.js';

const props = defineProps({
  bits: { type: Number, required: true },
});

const strength = computed(() => rateStrength(props.bits));
const label = computed(() => t(`strength${strength.value.key.charAt(0).toUpperCase()}${strength.value.key.slice(1)}`));
const bitsText = computed(() => t('entropyBits', String(Math.floor(props.bits))));
</script>

<template>
  <div class="strength" data-testid="strength" :data-score="strength.score">
    <meter
      class="visually-hidden"
      min="0"
      max="4"
      low="2"
      high="3"
      optimum="4"
      :value="strength.score"
      :aria-label="t('strengthLabel')"
      :aria-valuetext="`${label}, ${bitsText}`"
    ></meter>
    <div class="bars" aria-hidden="true">
      <span v-for="i in 5" :key="i" class="bar" :class="{ on: i - 1 <= strength.score }"></span>
    </div>
    <span class="text"
      ><span class="label">{{ label }}</span> · <span class="bits">{{ bitsText }}</span></span
    >
  </div>
</template>

<style scoped>
.strength {
  display: grid;
  gap: 5px;
  font-size: 12px;
}

.text {
  white-space: nowrap;
  color: var(--muted);
}

.bars {
  display: flex;
  gap: 3px;
}

.bar {
  inline-size: 18px;
  block-size: 6px;
  border-radius: 3px;
  background: var(--border);
  transition: background 0.2s;
}

.label {
  font-weight: 600;
  color: var(--text);
}

[data-score='0'] .on {
  background: var(--s0);
}
[data-score='1'] .on {
  background: var(--s1);
}
[data-score='2'] .on {
  background: var(--s2);
}
[data-score='3'] .on {
  background: var(--s3);
}
[data-score='4'] .on {
  background: var(--s4);
}
</style>
