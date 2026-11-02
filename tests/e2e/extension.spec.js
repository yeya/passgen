import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures.js';

/**
 * Reads the system clipboard from an extension page.
 *
 * @param {import('@playwright/test').Page} page Extension page.
 * @returns {Promise<string>} Clipboard text.
 */
async function readClipboard(page) {
  await page.bringToFront();
  return page.evaluate(() => navigator.clipboard.readText());
}

test.describe('manifest', () => {
  test('requests only the storage permission and a strict CSP', ({ extensionPath }) => {
    const manifest = JSON.parse(readFileSync(resolve(extensionPath, 'manifest.json'), 'utf8'));
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toEqual(['storage']);
    expect(manifest.background).toBeUndefined();
    expect(manifest.host_permissions).toBeUndefined();
    expect(manifest.content_scripts).toBeUndefined();
    expect(manifest.content_security_policy.extension_pages).toContain("script-src 'self'");
    expect(manifest.content_security_policy.extension_pages).not.toContain('unsafe');
  });
});

test.describe('popup', () => {
  test('shows a strong 20-character password with Copy focused', async ({ openPopup }) => {
    const popup = await openPopup();
    await expect(popup.getByTestId('secret')).toHaveText(/^.{20}$/);
    await expect(popup.getByTestId('strength')).toHaveAttribute('data-score', '4');
    await expect(popup.getByTestId('copy')).toBeFocused();
    await expect(popup.getByRole('heading', { name: 'PassGen' })).toBeVisible();
  });

  test('the Copy button keeps its size when it switches to "Copied"', async ({ context, openPopup }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const popup = await openPopup();
    const button = popup.getByTestId('copy');
    const before = await button.boundingBox();
    await button.click();
    await expect(button).toHaveAttribute('data-state', 'copied');
    await expect(button).toHaveAccessibleName('Copied');
    expect(await button.boundingBox()).toEqual(before);
  });

  test('regenerates and reacts to option changes', async ({ openPopup }) => {
    const popup = await openPopup();
    const secret = popup.getByTestId('secret');
    const first = await secret.textContent();
    await popup.getByTestId('regenerate').click();
    await expect(secret).not.toHaveText(first ?? '');

    await popup.getByTestId('length-input').fill('42');
    await popup.getByTestId('length-input').press('Tab');
    await expect(secret).toHaveText(/^.{42}$/);

    await popup.getByTestId('set-symbols').uncheck();
    await popup.getByTestId('set-uppercase').uncheck();
    await popup.getByTestId('set-lowercase').uncheck();
    await expect(secret).toHaveText(/^[0-9]{42}$/);
    await expect(popup.getByTestId('set-digits')).toBeDisabled();
  });

  test('copies with the keyboard and leaves the clipboard alone afterwards', async ({ context, openPopup }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const popup = await openPopup();
    const secret = await popup.getByTestId('secret').textContent();
    const height = (await popup.locator('main').boundingBox())?.height;

    await popup.keyboard.press('Enter');
    await expect(popup.getByTestId('copy')).toHaveAttribute('data-state', 'copied');
    expect(await readClipboard(popup)).toBe(secret);
    // No visible status line: the popup keeps its height.
    expect((await popup.locator('main').boundingBox())?.height).toBe(height);
    await expect(popup.getByTestId('status')).toHaveClass(/visually-hidden/);
  });

  test('remembers the passphrase mode and options across popup opens', async ({ openPopup }) => {
    let popup = await openPopup();
    await popup.getByTestId('mode-passphrase').click();
    await popup.getByTestId('separator').selectOption(' ');
    await expect(popup.getByTestId('secret')).toHaveText(/^(\S+ ){5}\S+$/);
    await popup.close();

    popup = await openPopup();
    await expect(popup.getByTestId('mode-passphrase')).toHaveAttribute('aria-checked', 'true');
    await expect(popup.getByTestId('secret')).toHaveText(/^(\S+ ){5}\S+$/);
  });

  test('opens the settings page', async ({ context, openPopup }) => {
    const popup = await openPopup();
    const [options] = await Promise.all([context.waitForEvent('page'), popup.getByTestId('open-settings').click()]);
    await expect(options).toHaveURL(/options\.html$/);
  });

  test('makes no network requests', async ({ context, openPopup, openOptions }) => {
    /** @type {string[]} */
    const external = [];
    context.on('request', (request) => {
      if (!request.url().startsWith('chrome-extension://')) {
        external.push(request.url());
      }
    });
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const popup = await openPopup();
    await popup.getByTestId('copy').click();
    await popup.getByTestId('mode-passphrase').click();
    await openOptions();
    expect(external).toEqual([]);
  });

  test('has no detectable accessibility violations', async ({ openPopup }) => {
    const popup = await openPopup();
    const results = await new AxeBuilder({ page: popup }).analyze();
    expect(results.violations).toEqual([]);
    await popup.getByTestId('mode-passphrase').click();
    const passphrase = await new AxeBuilder({ page: popup }).analyze();
    expect(passphrase.violations).toEqual([]);
  });
});

test.describe('settings and history', () => {
  test('history is off by default, warns it is not safe or synced, and lives in local storage only', async ({
    context,
    openPopup,
    openOptions,
    readStorage,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    let popup = await openPopup();
    await expect(popup.getByTestId('history')).toHaveCount(0);
    await popup.close();

    const options = await openOptions();
    await expect(options.getByTestId('history-not-synced')).toHaveCount(0);
    await options.getByTestId('history-enabled').check();
    await expect(options.getByTestId('history-not-synced')).toContainText('not synced');
    await expect(options.getByTestId('history-not-synced')).toContainText('unencrypted');

    popup = await openPopup();
    const secret = (await popup.getByTestId('secret').textContent()) ?? '';
    await popup.getByTestId('copy').click();
    await expect(popup.getByTestId('history')).toContainText(secret);

    const storage = await readStorage();
    expect(storage.sync.settings.historyEnabled).toBe(true);
    expect(JSON.stringify(storage.sync)).not.toContain(secret);
    expect(JSON.stringify(storage.session)).not.toContain(secret);
    expect(storage.local.history[0].value).toBe(secret);

    // History survives closing and reopening the popup.
    await popup.close();
    popup = await openPopup();
    await expect(popup.getByTestId('history')).toContainText(secret);

    // Turning history off erases it.
    await options.bringToFront();
    await options.getByTestId('history-enabled').uncheck();
    await expect.poll(async () => (await readStorage()).local.history).toBeUndefined();
  });

  test('settings sync storage holds the chosen options', async ({ openOptions, readStorage }) => {
    const options = await openOptions();
    await options.getByTestId('symbol-set').fill('#$%');
    await options.getByTestId('symbol-set').press('Tab');
    await expect
      .poll(async () => (await readStorage()).sync.settings)
      .toMatchObject({ password: { symbolSet: '#$%' } });
  });

  test('options page has no detectable accessibility violations', async ({ openOptions }) => {
    const options = await openOptions();
    await options.getByTestId('history-enabled').check();
    const results = await new AxeBuilder({ page: options }).analyze();
    expect(results.violations).toEqual([]);
  });
});
