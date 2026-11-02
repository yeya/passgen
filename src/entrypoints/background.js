import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { clearClipboard, scheduleClipboardClear } from '../lib/clipboard.js';
import { CLIPBOARD_ALARM, MESSAGES } from '../lib/messages.js';
import { CLIPBOARD_CLEAR_OPTIONS } from '../lib/constants.js';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message, sender) => {
    // Only accept messages from our own extension pages.
    if (sender.id !== browser.runtime.id || message?.type !== MESSAGES.SCHEDULE_CLIPBOARD_CLEAR) {
      return undefined;
    }
    const { seconds } = message;
    if (typeof seconds !== 'number' || !CLIPBOARD_CLEAR_OPTIONS.includes(seconds)) {
      return undefined;
    }
    return scheduleClipboardClear(seconds).then(() => true);
  });

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === CLIPBOARD_ALARM) {
      clearClipboard().catch((error) => console.error('PassGen: failed to clear clipboard', error));
    }
  });
});
