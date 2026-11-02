/**
 * Clipboard handling.
 *
 * Copying happens in the popup (a user gesture). Clearing happens later in the
 * background, because the popup closes as soon as the user clicks into a page.
 * The background schedules an alarm and, when it fires, clears the clipboard
 * through an offscreen document (Chrome/Edge) or its own page (Firefox).
 */

import { browser } from 'wxt/browser';
import { clearClipboardInDocument } from './clipboard-dom.js';
import { CLIPBOARD_ALARM, MESSAGES } from './messages.js';

const OFFSCREEN_PATH = '/offscreen.html';

/**
 * Copies text to the clipboard. Must be called from a user gesture in a
 * focused page such as the popup.
 *
 * @param {string} text Text to copy.
 * @returns {Promise<void>}
 */
export async function copyText(text) {
  await navigator.clipboard.writeText(text);
}

/**
 * Asks the background to clear the clipboard after `seconds`.
 *
 * @param {number} seconds Delay in seconds. 0 does nothing.
 * @returns {Promise<void>}
 */
export async function requestClipboardClear(seconds) {
  if (seconds <= 0) {
    return;
  }
  await browser.runtime.sendMessage({ type: MESSAGES.SCHEDULE_CLIPBOARD_CLEAR, seconds });
}

/**
 * Schedules (or reschedules) the clipboard-clearing alarm.
 *
 * @param {number} seconds Delay in seconds.
 * @returns {Promise<void>}
 */
export async function scheduleClipboardClear(seconds) {
  await browser.alarms.clear(CLIPBOARD_ALARM);
  if (seconds > 0) {
    await browser.alarms.create(CLIPBOARD_ALARM, { when: Date.now() + seconds * 1000 });
  }
}

/**
 * Clears the clipboard from the background context.
 *
 * @returns {Promise<void>}
 */
export async function clearClipboard() {
  // Firefox: the background is an event page with a DOM.
  if (typeof document !== 'undefined') {
    clearClipboardInDocument(document);
    return;
  }
  // Chrome / Edge: the background is a service worker without a DOM.
  const url = browser.runtime.getURL(OFFSCREEN_PATH);
  const existing = await browser.runtime.getContexts({
    contextTypes: [browser.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [url],
  });
  if (existing.length === 0) {
    await browser.offscreen.createDocument({
      url,
      reasons: [browser.offscreen.Reason.CLIPBOARD],
      justification: 'Clear the copied password from the clipboard after the configured delay.',
    });
  }
  try {
    await browser.runtime.sendMessage({ type: MESSAGES.OFFSCREEN_CLEAR_CLIPBOARD });
  } finally {
    await browser.offscreen.closeDocument();
  }
}
