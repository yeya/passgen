import { browser } from 'wxt/browser';
import { clearClipboardInDocument } from '../../lib/clipboard-dom.js';
import { MESSAGES } from '../../lib/messages.js';

browser.runtime.onMessage.addListener((message, sender) => {
  if (sender.id !== browser.runtime.id || message?.type !== MESSAGES.OFFSCREEN_CLEAR_CLIPBOARD) {
    return undefined;
  }
  return Promise.resolve(clearClipboardInDocument(document));
});
