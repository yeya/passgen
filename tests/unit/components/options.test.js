import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import App from '../../../src/entrypoints/options/App.vue';
import { DEFAULT_SYMBOLS } from '../../../src/lib/charsets.js';
import { addToHistory, getHistory } from '../../../src/lib/history.js';
import { defaultSettings, loadSettings, saveSettings } from '../../../src/lib/settings.js';

beforeEach(() => {
  fakeBrowser.commands = /** @type {any} */ ({
    getAll: vi.fn().mockResolvedValue([{ name: '_execute_action', shortcut: 'Alt+Shift+G' }]),
  });
});

/**
 * @returns {Promise<import('@vue/test-utils').VueWrapper>} Mounted options page.
 */
async function mountOptions() {
  const wrapper = mount(App);
  await flushPromises();
  return wrapper;
}

describe('options page', () => {
  it('shows the current settings and shortcut', async () => {
    const wrapper = await mountOptions();
    expect(wrapper.get('[data-testid="history-enabled"]').element.checked).toBe(false);
    expect(wrapper.get('[data-testid="symbol-set"]').element.value).toBe(DEFAULT_SYMBOLS);
    expect(wrapper.get('[data-testid="shortcut"]').text()).toContain('Alt+Shift+G');
  });

  it('says when no shortcut is set or the API is missing', async () => {
    fakeBrowser.commands = /** @type {any} */ ({ getAll: vi.fn().mockResolvedValue([]) });
    let wrapper = await mountOptions();
    expect(wrapper.get('[data-testid="shortcut"]').text()).toBe('No shortcut is set.');
    fakeBrowser.commands = /** @type {any} */ ({ getAll: vi.fn().mockRejectedValue(new Error('nope')) });
    wrapper = await mountOptions();
    expect(wrapper.get('[data-testid="shortcut"]').text()).toBe('No shortcut is set.');
  });

  it('warns that history is unencrypted and not synced, only while history is enabled', async () => {
    const wrapper = await mountOptions();
    expect(wrapper.find('[data-testid="history-not-synced"]').exists()).toBe(false);
    await wrapper.get('[data-testid="history-enabled"]').setValue(true);
    await flushPromises();
    expect((await loadSettings()).historyEnabled).toBe(true);
    const warning = wrapper.get('[data-testid="history-not-synced"]');
    expect(warning.text()).toContain('not synced');
    expect(warning.text()).toContain('unencrypted');
    expect(warning.attributes('role')).toBe('alert');
  });

  it('erases the history when it is turned off', async () => {
    await saveSettings({ ...defaultSettings(), historyEnabled: true });
    await addToHistory({ value: 'x', mode: 'password', createdAt: 1 });
    const wrapper = await mountOptions();
    await wrapper.get('[data-testid="history-enabled"]').setValue(false);
    await flushPromises();
    expect((await loadSettings()).historyEnabled).toBe(false);
    expect(await getHistory()).toEqual([]);
    expect(wrapper.find('[data-testid="history-not-synced"]').exists()).toBe(false);
  });

  it('sanitizes the symbol set and can restore the default', async () => {
    const wrapper = await mountOptions();
    const input = wrapper.get('[data-testid="symbol-set"]');
    await input.setValue('ab #$ #');
    await input.trigger('change');
    await flushPromises();
    expect((await loadSettings()).password.symbolSet).toBe('#$');
    expect(input.element.value).toBe('#$');

    await input.setValue('abc');
    await input.trigger('change');
    await flushPromises();
    expect(input.element.value).toBe('#$');

    await wrapper.get('[data-testid="reset-symbols"]').trigger('click');
    await flushPromises();
    expect((await loadSettings()).password.symbolSet).toBe(DEFAULT_SYMBOLS);
  });

  it('resets everything', async () => {
    await saveSettings({ ...defaultSettings(), historyEnabled: true, mode: 'passphrase' });
    await addToHistory({ value: 'x', mode: 'password', createdAt: 1 });
    const wrapper = await mountOptions();
    await wrapper.get('[data-testid="reset-all"]').trigger('click');
    await flushPromises();
    expect(await loadSettings()).toEqual(defaultSettings());
    expect(await getHistory()).toEqual([]);
  });
});
