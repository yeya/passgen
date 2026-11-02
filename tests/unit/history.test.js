import { describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { HISTORY_LIMIT } from '../../src/lib/constants.js';
import { addToHistory, clearHistory, getHistory } from '../../src/lib/history.js';

/**
 * @param {string} value Secret.
 * @param {number} [createdAt] Timestamp.
 * @returns {import('../../src/lib/history.js').HistoryEntry} Entry.
 */
const entry = (value, createdAt = 1) => ({ value, mode: 'password', createdAt });

describe('history', () => {
  it('is empty by default', async () => {
    expect(await getHistory()).toEqual([]);
  });

  it('stores entries newest first in session storage only', async () => {
    await addToHistory(entry('a', 1));
    await addToHistory(entry('b', 2));
    expect((await getHistory()).map((e) => e.value)).toEqual(['b', 'a']);

    expect(Object.keys(await fakeBrowser.storage.session.get(null))).toEqual(['history']);
    expect(await fakeBrowser.storage.sync.get(null)).toEqual({});
    expect(await fakeBrowser.storage.local.get(null)).toEqual({});
  });

  it('moves duplicates to the front instead of repeating them', async () => {
    await addToHistory(entry('a'));
    await addToHistory(entry('b'));
    await addToHistory(entry('a'));
    expect((await getHistory()).map((e) => e.value)).toEqual(['a', 'b']);
  });

  it(`keeps at most ${HISTORY_LIMIT} entries`, async () => {
    for (let i = 0; i < HISTORY_LIMIT + 5; i += 1) {
      await addToHistory(entry(`pw${i}`, i));
    }
    const history = await getHistory();
    expect(history).toHaveLength(HISTORY_LIMIT);
    expect(history[0].value).toBe(`pw${HISTORY_LIMIT + 4}`);
  });

  it('clears everything', async () => {
    await addToHistory(entry('a'));
    await clearHistory();
    expect(await getHistory()).toEqual([]);
    expect(await fakeBrowser.storage.session.get(null)).toEqual({});
  });

  it('ignores malformed stored data', async () => {
    await fakeBrowser.storage.session.set({ history: [entry('ok'), { value: 1 }, null, 'x'] });
    expect(await getHistory()).toEqual([entry('ok')]);
    await fakeBrowser.storage.session.set({ history: 'nope' });
    expect(await getHistory()).toEqual([]);
  });
});
