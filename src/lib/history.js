/**
 * Optional history of copied secrets.
 *
 * Off by default. When enabled, entries are kept in `storage.session`, which
 * lives in memory only, is never written to disk or synced, is not reachable
 * from content scripts, and is wiped when the browser closes.
 */

import { storage } from 'wxt/utils/storage';
import { HISTORY_LIMIT } from './constants.js';

/**
 * @typedef {object} HistoryEntry
 * @property {string} value The copied secret.
 * @property {'password' | 'passphrase'} mode Generator that produced it.
 * @property {number} createdAt Unix time in milliseconds.
 */

const historyItem = storage.defineItem('session:history', {
  fallback: /** @type {HistoryEntry[]} */ ([]),
});

/**
 * @param {unknown} entry Candidate entry.
 * @returns {entry is HistoryEntry} Whether the entry is well formed.
 */
function isEntry(entry) {
  if (entry === null || typeof entry !== 'object') {
    return false;
  }
  const e = /** @type {Record<string, unknown>} */ (entry);
  return (
    typeof e.value === 'string' && (e.mode === 'password' || e.mode === 'passphrase') && typeof e.createdAt === 'number'
  );
}

/**
 * Returns the history, newest first.
 *
 * @returns {Promise<HistoryEntry[]>} History entries.
 */
export async function getHistory() {
  const value = await historyItem.getValue();
  return Array.isArray(value) ? value.filter(isEntry) : [];
}

/**
 * Adds an entry to the front of the history. Duplicates move to the front.
 *
 * @param {HistoryEntry} entry Entry to add.
 * @returns {Promise<HistoryEntry[]>} The updated history.
 */
export async function addToHistory(entry) {
  const current = await getHistory();
  const next = [entry, ...current.filter((e) => e.value !== entry.value)].slice(0, HISTORY_LIMIT);
  await historyItem.setValue(next);
  return next;
}

/**
 * Deletes the whole history.
 *
 * @returns {Promise<void>}
 */
export async function clearHistory() {
  await historyItem.removeValue();
}
