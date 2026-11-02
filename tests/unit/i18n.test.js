import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { applyDocumentLocale, t } from '../../src/lib/i18n.js';

describe('i18n', () => {
  it('substitutes placeholders', () => {
    expect(t('entropyBits', '128')).toBe('128 bits');
  });

  it('falls back to the key when a message is missing', () => {
    expect(t('doesNotExist')).toBe('doesNotExist');
  });

  it('sets lang and dir on the document', () => {
    applyDocumentLocale(document);
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('supports right-to-left locales', () => {
    vi.spyOn(fakeBrowser.i18n, 'getUILanguage').mockReturnValue('he');
    vi.spyOn(fakeBrowser.i18n, 'getMessage').mockImplementation((key) => (key === '@@bidi_dir' ? 'rtl' : ''));
    applyDocumentLocale(document);
    expect(document.documentElement.lang).toBe('he');
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('every message key used in the source exists in en/messages.json', () => {
    const messages = JSON.parse(readFileSync(resolve(process.cwd(), 'public/_locales/en/messages.json'), 'utf8'));
    const used = new Set();
    const files = import.meta.glob('../../src/**/*.{js,vue}', { query: '?raw', import: 'default', eager: true });
    for (const source of Object.values(files)) {
      for (const match of String(source).matchAll(/\bt\('([A-Za-z0-9_]+)'/g)) {
        used.add(match[1]);
      }
      for (const match of String(source).matchAll(/__MSG_([A-Za-z0-9_]+)__/g)) {
        used.add(match[1]);
      }
    }
    expect(used.size).toBeGreaterThan(20);
    for (const key of used) {
      expect(messages, `missing message "${key}"`).toHaveProperty(key);
    }
  });
});
