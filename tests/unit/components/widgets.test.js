import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import HistoryList from '../../../src/components/HistoryList.vue';
import ModeSwitch from '../../../src/components/ModeSwitch.vue';
import PassphraseOptions from '../../../src/components/PassphraseOptions.vue';
import PasswordOptions from '../../../src/components/PasswordOptions.vue';
import SecretDisplay from '../../../src/components/SecretDisplay.vue';
import StrengthMeter from '../../../src/components/StrengthMeter.vue';
import { defaultSettings } from '../../../src/lib/settings.js';

describe('SecretDisplay', () => {
  it('renders the secret with digits and symbols highlighted', () => {
    const wrapper = mount(SecretDisplay, { props: { value: 'ab12#$cd' } });
    expect(wrapper.text()).toBe('ab12#$cd');
    expect(wrapper.find('.digit').text()).toBe('12');
    expect(wrapper.find('.symbol').text()).toBe('#$');
    expect(wrapper.findAll('.letter').map((w) => w.text())).toEqual(['ab', 'cd']);
    expect(wrapper.attributes('aria-label')).toBe('Generated secret');
    expect(wrapper.attributes('dir')).toBe('ltr');
  });

  it('never interprets the secret as HTML', () => {
    const wrapper = mount(SecretDisplay, { props: { value: '<img src=x>' } });
    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.text()).toBe('<img src=x>');
  });
});

describe('StrengthMeter', () => {
  it.each([
    [10, '0', 'Very weak'],
    [60, '2', 'Fair'],
    [128, '4', 'Very strong'],
  ])('%s bits shows score %s (%s)', (bits, score, label) => {
    const wrapper = mount(StrengthMeter, { props: { bits } });
    expect(wrapper.attributes('data-score')).toBe(score);
    expect(wrapper.text()).toContain(label);
    expect(wrapper.text()).toContain(`${Math.floor(bits)} bits`);
    expect(wrapper.findAll('.bar.on')).toHaveLength(Number(score) + 1);
    expect(wrapper.find('meter').attributes('aria-valuetext')).toBe(`${label}, ${bits} bits`);
  });
});

describe('ModeSwitch', () => {
  it('switches on click and marks the active option', async () => {
    const wrapper = mount(ModeSwitch, {
      props: { modelValue: 'password', 'onUpdate:modelValue': (v) => wrapper.setProps({ modelValue: v }) },
    });
    expect(wrapper.get('[data-testid="mode-password"]').attributes('aria-checked')).toBe('true');
    await wrapper.get('[data-testid="mode-passphrase"]').trigger('click');
    expect(wrapper.props('modelValue')).toBe('passphrase');
    expect(wrapper.get('[data-testid="mode-passphrase"]').attributes('aria-checked')).toBe('true');
    expect(wrapper.get('[data-testid="mode-passphrase"]').attributes('tabindex')).toBe('0');
    expect(wrapper.get('[data-testid="mode-password"]').attributes('tabindex')).toBe('-1');
  });

  it('supports arrow keys', async () => {
    const wrapper = mount(ModeSwitch, {
      props: { modelValue: 'password', 'onUpdate:modelValue': (v) => wrapper.setProps({ modelValue: v }) },
    });
    await wrapper.get('[role="radiogroup"]').trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.props('modelValue')).toBe('passphrase');
    await wrapper.get('[role="radiogroup"]').trigger('keydown', { key: 'ArrowLeft' });
    expect(wrapper.props('modelValue')).toBe('password');
    await wrapper.get('[role="radiogroup"]').trigger('keydown', { key: 'Enter' });
    expect(wrapper.props('modelValue')).toBe('password');
  });
});

/**
 * Mounts an options component with a v-model bound to a local value.
 *
 * @param {any} component Component.
 * @param {object} modelValue Initial model.
 * @returns {import('@vue/test-utils').VueWrapper} Wrapper.
 */
function mountWithModel(component, modelValue) {
  const wrapper = mount(component, {
    props: { modelValue, 'onUpdate:modelValue': (v) => wrapper.setProps({ modelValue: v }) },
  });
  return wrapper;
}

describe('PasswordOptions', () => {
  it('updates and clamps the length', async () => {
    const wrapper = mountWithModel(PasswordOptions, defaultSettings().password);
    await wrapper.get('[data-testid="length-input"]').setValue('32');
    expect(wrapper.props('modelValue').length).toBe(32);
    await wrapper.get('[data-testid="length-input"]').setValue('500');
    expect(wrapper.props('modelValue').length).toBe(128);
    await wrapper.get('[data-testid="length-input"]').setValue('1');
    expect(wrapper.props('modelValue').length).toBe(4);
    await wrapper.get('[data-testid="length-range"]').setValue('12');
    expect(wrapper.props('modelValue').length).toBe(12);
  });

  it('ignores non-numeric length input', async () => {
    const wrapper = mountWithModel(PasswordOptions, defaultSettings().password);
    const input = wrapper.get('[data-testid="length-input"]');
    /** @type {HTMLInputElement} */ (input.element).type = 'text';
    await input.setValue('abc');
    expect(wrapper.props('modelValue').length).toBe(20);
  });

  it('toggles character sets without mutating the original object', async () => {
    const original = defaultSettings().password;
    const wrapper = mountWithModel(PasswordOptions, original);
    await wrapper.get('[data-testid="set-symbols"]').setValue(false);
    expect(wrapper.props('modelValue').symbols).toBe(false);
    expect(original.symbols).toBe(true);
    await wrapper.get('[data-testid="exclude-ambiguous"]').setValue(true);
    expect(wrapper.props('modelValue').excludeAmbiguous).toBe(true);
  });

  it('prevents disabling the last character set', () => {
    const wrapper = mountWithModel(PasswordOptions, {
      ...defaultSettings().password,
      uppercase: false,
      digits: false,
      symbols: false,
    });
    expect(wrapper.get('[data-testid="set-lowercase"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-testid="set-uppercase"]').attributes('disabled')).toBeUndefined();
  });
});

describe('PassphraseOptions', () => {
  it('updates every option', async () => {
    const wrapper = mountWithModel(PassphraseOptions, defaultSettings().passphrase);
    await wrapper.get('[data-testid="words-input"]').setValue('8');
    await wrapper.get('[data-testid="separator"]').setValue(' ');
    await wrapper.get('[data-testid="capitalize"]').setValue(false);
    await wrapper.get('[data-testid="include-number"]').setValue(false);
    expect(wrapper.props('modelValue')).toEqual({ words: 8, separator: ' ', capitalize: false, includeNumber: false });
    await wrapper.get('[data-testid="words-range"]').setValue('25');
    expect(wrapper.props('modelValue').words).toBe(20);
  });

  it('ignores non-numeric word counts', async () => {
    const wrapper = mountWithModel(PassphraseOptions, defaultSettings().passphrase);
    const input = wrapper.get('[data-testid="words-input"]');
    /** @type {HTMLInputElement} */ (input.element).type = 'text';
    await input.setValue('many');
    expect(wrapper.props('modelValue').words).toBe(6);
  });
});

describe('HistoryList', () => {
  it('shows a hint when empty', () => {
    const wrapper = mount(HistoryList, { props: { entries: [] } });
    expect(wrapper.text()).toContain('Copied passwords will appear here');
    expect(wrapper.find('[data-testid="clear-history"]').exists()).toBe(false);
  });

  it('lists entries and emits copy / clear', async () => {
    const entries = [
      { value: 'first', mode: 'password', createdAt: 2 },
      { value: 'second', mode: 'passphrase', createdAt: 1 },
    ];
    const wrapper = mount(HistoryList, { props: { entries } });
    expect(wrapper.findAll('li').map((li) => li.text())).toEqual(['first', 'second']);
    await wrapper.findAll('li button')[1].trigger('click');
    expect(wrapper.emitted('copy')).toEqual([['second']]);
    await wrapper.get('[data-testid="clear-history"]').trigger('click');
    expect(wrapper.emitted('clear')).toHaveLength(1);
  });
});
