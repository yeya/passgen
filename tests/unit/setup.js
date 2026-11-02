import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

/** English messages, so components render real text in tests. */
const messages = JSON.parse(readFileSync(resolve(process.cwd(), 'public/_locales/en/messages.json'), 'utf8'));

/**
 * Minimal `i18n.getMessage` with `$NAME$` placeholder support, mirroring the browser.
 *
 * @param {string} key Message name.
 * @param {string | string[]} [substitutions] Substitution values.
 * @returns {string} The message, or '' when missing (like the real API).
 */
export function getMessage(key, substitutions) {
  if (key === '@@bidi_dir') {
    return 'ltr';
  }
  const entry = messages[key];
  if (!entry) {
    return '';
  }
  const subs = substitutions === undefined ? [] : [substitutions].flat();
  return entry.message.replace(/\$([A-Za-z0-9_]+)\$/g, (_, name) => {
    const placeholder = entry.placeholders?.[name.toLowerCase()];
    const index = Number(placeholder?.content.replace('$', '')) - 1;
    return subs[index] ?? '';
  });
}

beforeEach(() => {
  fakeBrowser.reset();
  vi.spyOn(fakeBrowser.i18n, 'getMessage').mockImplementation(getMessage);
  vi.spyOn(fakeBrowser.i18n, 'getUILanguage').mockReturnValue('en');
});
