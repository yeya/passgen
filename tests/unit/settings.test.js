import { describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { DEFAULT_SYMBOLS } from '../../src/lib/charsets.js';
import {
  DEFAULT_SETTINGS,
  defaultSettings,
  loadSettings,
  normalizeSettings,
  saveSettings,
  watchSettings,
} from '../../src/lib/settings.js';

describe('defaults', () => {
  it('has secure, private defaults', () => {
    const s = defaultSettings();
    expect(s.historyEnabled).toBe(false);
    expect(s.clipboardClearSeconds).toBeGreaterThan(0);
    expect(s.password.length).toBeGreaterThanOrEqual(16);
    expect(s.password.symbolSet).toBe(DEFAULT_SYMBOLS);
    expect(s.passphrase.words).toBeGreaterThanOrEqual(6);
  });

  it('returns independent copies', () => {
    const a = defaultSettings();
    a.password.length = 5;
    expect(defaultSettings().password.length).toBe(DEFAULT_SETTINGS.password.length);
  });
});

describe('normalizeSettings', () => {
  it.each([undefined, null, 42, 'x', []])('returns defaults for %j', (input) => {
    expect(normalizeSettings(input)).toEqual(defaultSettings());
  });

  it('keeps valid values', () => {
    const custom = {
      mode: 'passphrase',
      password: {
        length: 32,
        lowercase: true,
        uppercase: false,
        digits: true,
        symbols: false,
        excludeAmbiguous: true,
        symbolSet: '#$',
      },
      passphrase: { words: 8, separator: ' ', capitalize: false, includeNumber: false },
      clipboardClearSeconds: 0,
      historyEnabled: true,
    };
    expect(normalizeSettings(custom)).toEqual(custom);
  });

  it('clamps and repairs invalid values', () => {
    const s = normalizeSettings({
      mode: 'evil',
      password: { length: 9999, lowercase: 'yes', symbolSet: 'abc 123' },
      passphrase: { words: 1, separator: '<b>' },
      clipboardClearSeconds: 7,
      historyEnabled: 'true',
    });
    expect(s.mode).toBe('password');
    expect(s.password.length).toBe(128);
    expect(s.password.lowercase).toBe(true);
    expect(s.password.symbolSet).toBe(DEFAULT_SYMBOLS);
    expect(s.passphrase.words).toBe(3);
    expect(s.passphrase.separator).toBe('-');
    expect(s.clipboardClearSeconds).toBe(DEFAULT_SETTINGS.clipboardClearSeconds);
    expect(s.historyEnabled).toBe(false);
  });

  it('rounds fractional numbers and rejects NaN', () => {
    expect(normalizeSettings({ password: { length: 12.6 } }).password.length).toBe(13);
    expect(normalizeSettings({ password: { length: Number.NaN } }).password.length).toBe(20);
  });

  it('never leaves every character set disabled', () => {
    const s = normalizeSettings({
      password: { lowercase: false, uppercase: false, digits: false, symbols: false },
    });
    expect(s.password.lowercase).toBe(true);
  });
});

describe('persistence', () => {
  it('loads defaults when nothing is stored', async () => {
    expect(await loadSettings()).toEqual(defaultSettings());
  });

  it('saves to sync storage so settings follow the user across devices', async () => {
    const s = defaultSettings();
    s.password.length = 33;
    await saveSettings(s);
    const raw = await fakeBrowser.storage.sync.get('settings');
    expect(raw.settings.password.length).toBe(33);
    expect(await fakeBrowser.storage.local.get(null)).toEqual({});
    expect((await loadSettings()).password.length).toBe(33);
  });

  it('validates before saving', async () => {
    const saved = await saveSettings(/** @type {any} */ ({ password: { length: 1 } }));
    expect(saved.password.length).toBe(4);
  });

  it('sanitizes tampered storage on load', async () => {
    await fakeBrowser.storage.sync.set({ settings: { mode: 'x', password: { length: -5 } } });
    const s = await loadSettings();
    expect(s.mode).toBe('password');
    expect(s.password.length).toBe(4);
  });

  it('notifies watchers with normalized settings', async () => {
    const callback = vi.fn();
    const unwatch = watchSettings(callback);
    await fakeBrowser.storage.sync.set({ settings: { historyEnabled: true } });
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ historyEnabled: true, mode: 'password' }));
    unwatch();
  });
});
