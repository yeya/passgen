import { describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { clearClipboardInDocument } from '../../src/lib/clipboard-dom.js';
import { clearClipboard, copyText, requestClipboardClear, scheduleClipboardClear } from '../../src/lib/clipboard.js';
import { CLIPBOARD_ALARM, MESSAGES } from '../../src/lib/messages.js';

describe('copyText', () => {
  it('writes to the async clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await copyText('secret');
    expect(writeText).toHaveBeenCalledWith('secret');
    vi.unstubAllGlobals();
  });
});

describe('requestClipboardClear', () => {
  it('asks the background to schedule clearing', async () => {
    const send = vi.spyOn(fakeBrowser.runtime, 'sendMessage').mockResolvedValue(true);
    await requestClipboardClear(60);
    expect(send).toHaveBeenCalledWith({ type: MESSAGES.SCHEDULE_CLIPBOARD_CLEAR, seconds: 60 });
  });

  it('does nothing when clearing is disabled', async () => {
    const send = vi.spyOn(fakeBrowser.runtime, 'sendMessage');
    await requestClipboardClear(0);
    expect(send).not.toHaveBeenCalled();
  });
});

describe('scheduleClipboardClear', () => {
  it('creates a single alarm at the right time and replaces older ones', async () => {
    vi.useFakeTimers({ now: 1_000_000, toFake: ['Date'] });
    await scheduleClipboardClear(30);
    await scheduleClipboardClear(60);
    const alarms = await fakeBrowser.alarms.getAll();
    expect(alarms).toHaveLength(1);
    expect(alarms[0]).toMatchObject({ name: CLIPBOARD_ALARM, scheduledTime: 1_000_000 + 60_000 });
    vi.useRealTimers();
  });

  it('cancels the alarm when given 0', async () => {
    await scheduleClipboardClear(30);
    await scheduleClipboardClear(0);
    expect(await fakeBrowser.alarms.getAll()).toEqual([]);
  });
});

describe('clearClipboardInDocument', () => {
  it('overwrites the clipboard with an empty string and cleans up', () => {
    /** @type {string | undefined} */
    let written;
    const exec = vi.fn(() => {
      const event = new Event('copy', { cancelable: true });
      Object.defineProperty(event, 'clipboardData', {
        value: { setData: (/** @type {string} */ _type, /** @type {string} */ value) => (written = value) },
      });
      document.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      return true;
    });
    document.execCommand = exec;
    expect(clearClipboardInDocument(document)).toBe(true);
    expect(exec).toHaveBeenCalledWith('copy');
    expect(written).toBe('');
    expect(document.querySelector('textarea')).toBeNull();
  });
});

describe('clearClipboard', () => {
  it('clears directly when the background has a DOM (Firefox)', async () => {
    const exec = vi.fn(() => true);
    document.execCommand = exec;
    await clearClipboard();
    expect(exec).toHaveBeenCalledWith('copy');
  });

  it('uses an offscreen document in a service worker (Chrome, Edge)', async () => {
    vi.stubGlobal('document', undefined);
    const offscreen = {
      Reason: { CLIPBOARD: 'CLIPBOARD' },
      createDocument: vi.fn().mockResolvedValue(undefined),
      closeDocument: vi.fn().mockResolvedValue(undefined),
    };
    // @ts-expect-error -- fake browser has no offscreen API.
    fakeBrowser.offscreen = offscreen;
    fakeBrowser.runtime.ContextType = /** @type {any} */ ({ OFFSCREEN_DOCUMENT: 'OFFSCREEN_DOCUMENT' });
    fakeBrowser.runtime.getContexts = vi.fn().mockResolvedValue([]);
    const send = vi.spyOn(fakeBrowser.runtime, 'sendMessage').mockResolvedValue(true);

    await clearClipboard();

    expect(offscreen.createDocument).toHaveBeenCalledWith(
      expect.objectContaining({ url: expect.stringMatching(/\/offscreen\.html$/), reasons: ['CLIPBOARD'] }),
    );
    expect(send).toHaveBeenCalledWith({ type: MESSAGES.OFFSCREEN_CLEAR_CLIPBOARD });
    expect(offscreen.closeDocument).toHaveBeenCalled();

    // Reuses an existing offscreen document.
    offscreen.createDocument.mockClear();
    fakeBrowser.runtime.getContexts = vi.fn().mockResolvedValue([{}]);
    await clearClipboard();
    expect(offscreen.createDocument).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
    // @ts-expect-error -- cleanup.
    delete fakeBrowser.offscreen;
  });
});
