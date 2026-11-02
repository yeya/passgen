<script setup>
import { t } from '../lib/i18n.js';
import AppIcon from './AppIcon.vue';

defineProps({
  /** @type {import('vue').PropType<import('../lib/history.js').HistoryEntry[]>} */
  entries: { type: Array, required: true },
});

const emit = defineEmits({
  // Payload: the secret to copy.
  copy: (value) => typeof value === 'string',
  clear: () => true,
});
</script>

<template>
  <section class="history" data-testid="history">
    <div class="head">
      <h2>{{ t('history') }}</h2>
      <button
        v-if="entries.length > 0"
        type="button"
        class="btn btn-small"
        data-testid="clear-history"
        @click="emit('clear')"
      >
        <AppIcon name="trash" />
        {{ t('clearHistory') }}
      </button>
    </div>
    <p v-if="entries.length === 0" class="help">{{ t('historyEmpty') }}</p>
    <ul v-else>
      <li v-for="entry in entries" :key="entry.createdAt + entry.value">
        <code dir="ltr" translate="no">{{ entry.value }}</code>
        <button
          type="button"
          class="btn btn-icon"
          :title="t('copy')"
          :aria-label="t('copyFromHistory', entry.value)"
          @click="emit('copy', entry.value)"
        >
          <AppIcon name="copy" />
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.history {
  border-block-start: 1px solid var(--border);
  padding-block-start: 10px;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-block-end: 6px;
}

h2 {
  font-size: 13px;
  margin: 0;
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
  max-block-size: 160px;
  overflow-y: auto;
}

li {
  display: flex;
  align-items: center;
  gap: 8px;
}

code {
  flex: 1;
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--mono);
  font-size: 12px;
}

.btn-icon {
  inline-size: 28px;
  min-block-size: 28px;
}

.btn-small {
  min-block-size: 28px;
  padding-inline: 8px;
  font-size: 12px;
  gap: 4px;
}

.btn-small :deep(.icon) {
  inline-size: 14px;
  block-size: 14px;
}
</style>
