/**
 * User settings: defaults, validation and persistence.
 *
 * Settings never contain secrets, so they live in `storage.sync` and follow
 * the user across devices.
 */

import { storage } from 'wxt/utils/storage';
import { DEFAULT_SYMBOLS, sanitizeSymbols } from './charsets.js';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from './password.js';
import { MAX_WORDS, MIN_WORDS, SEPARATORS } from './passphrase.js';

import { CLIPBOARD_CLEAR_OPTIONS } from './constants.js';

export { CLIPBOARD_CLEAR_OPTIONS, HISTORY_LIMIT } from './constants.js';

/**
 * @typedef {'password' | 'passphrase'} Mode
 */

/**
 * @typedef {object} Settings
 * @property {Mode} mode Which generator the popup shows.
 * @property {import('./password.js').PasswordOptions} password Password generator options.
 * @property {import('./passphrase.js').PassphraseOptions} passphrase Passphrase generator options.
 * @property {number} clipboardClearSeconds Seconds before the clipboard is cleared after copying. 0 disables it.
 * @property {boolean} historyEnabled Keep copied secrets in a session-only history.
 */

/** @type {Readonly<Settings>} */
export const DEFAULT_SETTINGS = Object.freeze({
  mode: 'password',
  password: Object.freeze({
    length: 20,
    lowercase: true,
    uppercase: true,
    digits: true,
    symbols: true,
    excludeAmbiguous: false,
    symbolSet: DEFAULT_SYMBOLS,
  }),
  passphrase: Object.freeze({
    words: 6,
    separator: '-',
    capitalize: true,
    includeNumber: true,
  }),
  clipboardClearSeconds: 60,
  historyEnabled: false,
});

/**
 * Returns a fresh, mutable copy of the default settings.
 *
 * @returns {Settings} Default settings.
 */
export function defaultSettings() {
  return structuredClone(
    /** @type {Settings} */ ({
      ...DEFAULT_SETTINGS,
      password: { ...DEFAULT_SETTINGS.password },
      passphrase: { ...DEFAULT_SETTINGS.passphrase },
    }),
  );
}

/**
 * @param {unknown} value Candidate value.
 * @param {boolean} fallback Value used when `value` is not a boolean.
 * @returns {boolean} The boolean.
 */
function bool(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

/**
 * @param {unknown} value Candidate value.
 * @param {number} min Lowest allowed value.
 * @param {number} max Highest allowed value.
 * @param {number} fallback Value used when `value` is not a finite number.
 * @returns {number} An integer clamped to `[min, max]`.
 */
function clampInt(value, min, max, fallback) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * @param {unknown} value Candidate value.
 * @returns {Record<string, unknown>} The value if it is a plain object, otherwise `{}`.
 */
function asObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? /** @type {Record<string, unknown>} */ (value)
    : {};
}

/**
 * Validates settings read from storage (or anywhere else untrusted) and fills
 * in defaults for anything missing or invalid. Never throws.
 *
 * @param {unknown} input Raw settings.
 * @returns {Settings} Valid settings.
 */
export function normalizeSettings(input) {
  const defaults = defaultSettings();
  const raw = asObject(input);
  const pw = asObject(raw.password);
  const pp = asObject(raw.passphrase);

  const symbolSet = typeof pw.symbolSet === 'string' ? sanitizeSymbols(pw.symbolSet) : '';

  /** @type {Settings} */
  const settings = {
    mode: raw.mode === 'passphrase' ? 'passphrase' : 'password',
    password: {
      length: clampInt(pw.length, MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH, defaults.password.length),
      lowercase: bool(pw.lowercase, defaults.password.lowercase),
      uppercase: bool(pw.uppercase, defaults.password.uppercase),
      digits: bool(pw.digits, defaults.password.digits),
      symbols: bool(pw.symbols, defaults.password.symbols),
      excludeAmbiguous: bool(pw.excludeAmbiguous, defaults.password.excludeAmbiguous),
      symbolSet: symbolSet.length > 0 ? symbolSet : defaults.password.symbolSet,
    },
    passphrase: {
      words: clampInt(pp.words, MIN_WORDS, MAX_WORDS, defaults.passphrase.words),
      separator:
        typeof pp.separator === 'string' && SEPARATORS.includes(pp.separator)
          ? pp.separator
          : defaults.passphrase.separator,
      capitalize: bool(pp.capitalize, defaults.passphrase.capitalize),
      includeNumber: bool(pp.includeNumber, defaults.passphrase.includeNumber),
    },
    clipboardClearSeconds:
      typeof raw.clipboardClearSeconds === 'number' && CLIPBOARD_CLEAR_OPTIONS.includes(raw.clipboardClearSeconds)
        ? raw.clipboardClearSeconds
        : defaults.clipboardClearSeconds,
    historyEnabled: bool(raw.historyEnabled, defaults.historyEnabled),
  };

  // Never allow a configuration that cannot produce a password.
  const p = settings.password;
  if (!p.lowercase && !p.uppercase && !p.digits && !p.symbols) {
    p.lowercase = true;
  }
  return settings;
}

const settingsItem = storage.defineItem('sync:settings', {
  fallback: /** @type {unknown} */ (null),
  version: 1,
});

/**
 * Loads the settings from storage.
 *
 * @returns {Promise<Settings>} Valid settings.
 */
export async function loadSettings() {
  return normalizeSettings(await settingsItem.getValue());
}

/**
 * Validates and saves the settings.
 *
 * @param {Settings} settings Settings to save.
 * @returns {Promise<Settings>} The settings that were actually saved.
 */
export async function saveSettings(settings) {
  const valid = normalizeSettings(settings);
  await settingsItem.setValue(valid);
  return valid;
}

/**
 * Calls `callback` whenever the stored settings change (for example from the
 * options page while the popup is open).
 *
 * @param {(settings: Settings) => void} callback Change listener.
 * @returns {() => void} Function that removes the listener.
 */
export function watchSettings(callback) {
  return settingsItem.watch((value) => callback(normalizeSettings(value)));
}
