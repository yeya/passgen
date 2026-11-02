/**
 * Thin wrapper around `browser.i18n`. Messages live in
 * `public/_locales/<locale>/messages.json`; add a folder there to add a
 * language. The UI uses CSS logical properties, so right-to-left languages work.
 */

import { browser } from 'wxt/browser';

/**
 * Returns the localized message for `key`, or `key` itself when missing so
 * a missing translation is visible instead of silently blank.
 *
 * @param {string} key Message name from `messages.json`.
 * @param {string | string[]} [substitutions] Values for `$1`, `$2`, ... placeholders.
 * @returns {string} The localized message.
 */
export function t(key, substitutions) {
  return browser.i18n.getMessage(key, substitutions) || key;
}

/**
 * Sets `lang` and `dir` on the document root from the browser UI language.
 *
 * @param {Document} doc Document to update.
 * @returns {void}
 */
export function applyDocumentLocale(doc) {
  doc.documentElement.lang = browser.i18n.getUILanguage();
  doc.documentElement.dir = browser.i18n.getMessage('@@bidi_dir') === 'rtl' ? 'rtl' : 'ltr';
}
