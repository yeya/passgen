import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import App from '../../../src/entrypoints/popup/App.vue';
import { getHistory } from '../../../src/lib/history.js';
import { MESSAGES } from '../../../src/lib/messages.js';
import { saveSettings, defaultSettings, loadSettings } from '../../../src/lib/settings.js';

/** @type {import('vitest').Mock} */
let writeText;
/** @type {import('vitest').MockInstance} */
let sendMessage;

beforeEach(() => {
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  sendMessage = vi.spyOn(fakeBrowser.runtime, 'sendMessage').mockResolvedValue(true);
});

afterEach(() => {
  document.body.innerHTML = '';
});

/**
 * Mounts the popup and waits for settings to load.
 *
 * @returns {Promise<import('@vue/test-utils').VueWrapper>} Wrapper.
 */
async function mountPopup() {
  const wrapper = mount(App, { attachTo: document.body });
  await flushPromises();
  return wrapper;
}

/**
 * @param {import('@vue/test-utils').VueWrapper} wrapper Popup wrapper.
 * @returns {string} The displayed secret.
 */
const secretOf = (wrapper) => wrapper.get('[data-testid="secret"]').text();

describe('popup', () => {
  it('shows a strong password on open with the copy button focused', async () => {
    const wrapper = await mountPopup();
    expect(secretOf(wrapper)).toHaveLength(20);
    expect(wrapper.get('[data-testid="strength"]').attributes('data-score')).toBe('4');
    expect(document.activeElement).toBe(wrapper.get('[data-testid="copy"]').element);
    expect(wrapper.find('[data-testid="history"]').exists()).toBe(false);
  });

  it('regenerates on demand', async () => {
    const wrapper = await mountPopup();
    const first = secretOf(wrapper);
    await wrapper.get('[data-testid="regenerate"]').trigger('click');
    expect(secretOf(wrapper)).not.toBe(first);
  });

  it('copies, asks the background to clear the clipboard and does not keep history by default', async () => {
    const wrapper = await mountPopup();
    const secret = secretOf(wrapper);
    await wrapper.get('[data-testid="copy"]').trigger('click');
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith(secret);
    expect(sendMessage).toHaveBeenCalledWith({ type: MESSAGES.SCHEDULE_CLIPBOARD_CLEAR, seconds: 60 });
    expect(wrapper.get('[data-testid="status"]').text()).toContain('cleared in 60 seconds');
    expect(wrapper.get('[data-testid="copy"]').text()).toBe('Copied');
    expect(await getHistory()).toEqual([]);
  });

  it('resets the "Copied" label after a moment and on regenerate', async () => {
    vi.useFakeTimers();
    const wrapper = await mountPopup();
    await wrapper.get('[data-testid="copy"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="copy"]').text()).toBe('Copied');
    vi.advanceTimersByTime(1600);
    await flushPromises();
    expect(wrapper.get('[data-testid="copy"]').text()).toBe('Copy');
    vi.useRealTimers();
  });

  it('does not schedule clearing when disabled', async () => {
    await saveSettings({ ...defaultSettings(), clipboardClearSeconds: 0 });
    const wrapper = await mountPopup();
    await wrapper.get('[data-testid="copy"]').trigger('click');
    await flushPromises();
    expect(sendMessage).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="status"]').text()).toBe('Copied');
  });

  it('reports copy failures', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    const wrapper = await mountPopup();
    await wrapper.get('[data-testid="copy"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="status"]').text()).toBe('Could not copy to the clipboard.');
    expect(wrapper.get('[data-testid="status"]').classes()).toContain('error');
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('still copies if scheduling the clear fails', async () => {
    sendMessage.mockRejectedValue(new Error('no background'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const wrapper = await mountPopup();
    await wrapper.get('[data-testid="copy"]').trigger('click');
    await flushPromises();
    expect(writeText).toHaveBeenCalled();
    expect(log).toHaveBeenCalled();
  });

  it('switches to passphrase mode and remembers it', async () => {
    const wrapper = await mountPopup();
    await wrapper.get('[data-testid="mode-passphrase"]').trigger('click');
    await flushPromises();
    expect(secretOf(wrapper)).toMatch(/^([A-Z][a-z-]*[0-9]?-){5}[A-Z][a-z-]*[0-9]?$/);
    expect(wrapper.find('[data-testid="words-input"]').exists()).toBe(true);
    expect((await loadSettings()).mode).toBe('passphrase');
  });

  it('regenerates and saves when options change', async () => {
    const wrapper = await mountPopup();
    await wrapper.get('[data-testid="length-input"]').setValue('40');
    await flushPromises();
    expect(secretOf(wrapper)).toHaveLength(40);
    expect((await loadSettings()).password.length).toBe(40);
  });

  it('records and shows history when enabled, and clears it', async () => {
    await saveSettings({ ...defaultSettings(), historyEnabled: true });
    const wrapper = await mountPopup();
    expect(wrapper.find('[data-testid="history"]').exists()).toBe(true);
    const secret = secretOf(wrapper);
    await wrapper.get('[data-testid="copy"]').trigger('click');
    await flushPromises();
    expect((await getHistory()).map((e) => e.value)).toEqual([secret]);
    expect(wrapper.get('[data-testid="history"]').text()).toContain(secret);

    // Copy again from history.
    writeText.mockClear();
    await wrapper.get('[data-testid="history"] li button').trigger('click');
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith(secret);

    await wrapper.get('[data-testid="clear-history"]').trigger('click');
    await flushPromises();
    expect(await getHistory()).toEqual([]);
    expect(wrapper.findAll('[data-testid="history"] li')).toHaveLength(0);
  });

  it('follows settings changed elsewhere (e.g. the options page)', async () => {
    const wrapper = await mountPopup();
    await saveSettings({ ...defaultSettings(), historyEnabled: true });
    await flushPromises();
    expect(wrapper.find('[data-testid="history"]').exists()).toBe(true);
  });

  it('opens the options page', async () => {
    const open = vi.fn().mockResolvedValue(undefined);
    fakeBrowser.runtime.openOptionsPage = open;
    const wrapper = await mountPopup();
    await wrapper.get('[data-testid="open-settings"]').trigger('click');
    expect(open).toHaveBeenCalled();
  });
});
