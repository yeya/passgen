import { describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import background from '../../src/entrypoints/background.js';
import * as clipboard from '../../src/lib/clipboard.js';
import { CLIPBOARD_ALARM, MESSAGES } from '../../src/lib/messages.js';

/**
 * Delivers a message to the background listener as if sent by `senderId`.
 *
 * @param {unknown} message Message.
 * @param {string} [senderId] Sending extension's id.
 * @returns {Promise<unknown[]>} Listener results.
 */
function deliver(message, senderId = fakeBrowser.runtime.id) {
  return fakeBrowser.runtime.onMessage.trigger(message, { id: senderId }, () => {});
}

describe('background', () => {
  it('schedules clearing for valid requests from the extension', async () => {
    background.main();
    await Promise.all(await deliver({ type: MESSAGES.SCHEDULE_CLIPBOARD_CLEAR, seconds: 30 }));
    const alarms = await fakeBrowser.alarms.getAll();
    expect(alarms.map((a) => a.name)).toEqual([CLIPBOARD_ALARM]);
  });

  it('ignores other extensions, unknown messages and invalid delays', async () => {
    background.main();
    await deliver({ type: MESSAGES.SCHEDULE_CLIPBOARD_CLEAR, seconds: 30 }, 'evil-extension');
    await deliver({ type: 'something-else' });
    await deliver(null);
    await deliver({ type: MESSAGES.SCHEDULE_CLIPBOARD_CLEAR, seconds: 1 });
    await deliver({ type: MESSAGES.SCHEDULE_CLIPBOARD_CLEAR, seconds: '30' });
    expect(await fakeBrowser.alarms.getAll()).toEqual([]);
  });

  it('clears the clipboard when the alarm fires', async () => {
    const clear = vi.spyOn(clipboard, 'clearClipboard').mockResolvedValue(undefined);
    background.main();
    await fakeBrowser.alarms.onAlarm.trigger({ name: CLIPBOARD_ALARM, scheduledTime: Date.now() });
    expect(clear).toHaveBeenCalledTimes(1);
    await fakeBrowser.alarms.onAlarm.trigger({ name: 'other', scheduledTime: Date.now() });
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it('logs instead of crashing when clearing fails', async () => {
    vi.spyOn(clipboard, 'clearClipboard').mockRejectedValue(new Error('boom'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    background.main();
    await fakeBrowser.alarms.onAlarm.trigger({ name: CLIPBOARD_ALARM, scheduledTime: Date.now() });
    await vi.waitFor(() => expect(log).toHaveBeenCalled());
  });
});
