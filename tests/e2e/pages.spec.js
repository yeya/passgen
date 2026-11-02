import { readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { test as base, expect } from '@playwright/test';
import { installWebExtensionStub } from './webext-stub.js';

const ORIGIN = 'http://passgen.test';
const CONTENT_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
};

/**
 * Serves the built extension folder at {@link ORIGIN} and injects the
 * WebExtension API stub into every page.
 *
 * @type {import('@playwright/test').TestType<
 *   import('@playwright/test').PlaywrightTestArgs & import('@playwright/test').PlaywrightTestOptions & {
 *     open: (file: string) => Promise<import('@playwright/test').Page>,
 *   },
 *   import('@playwright/test').PlaywrightWorkerArgs & import('@playwright/test').PlaywrightWorkerOptions & {
 *     pagesPath: string,
 *   }
 * >}
 */
const test = base.extend({
  pagesPath: ['.output/firefox-mv3', { option: true, scope: 'worker' }],

  context: async ({ context, pagesPath }, use) => {
    const root = resolve(pagesPath);
    const messages = JSON.parse(readFileSync(resolve(root, '_locales/en/messages.json'), 'utf8'));
    await context.route(`${ORIGIN}/**`, (route) => {
      const path = new URL(route.request().url()).pathname;
      const file = resolve(root, `.${path}`);
      if (!file.startsWith(root)) {
        return route.fulfill({ status: 403 });
      }
      try {
        return route.fulfill({
          body: readFileSync(file),
          contentType: CONTENT_TYPES[/** @type {keyof typeof CONTENT_TYPES} */ (extname(file))] ?? 'text/plain',
        });
      } catch {
        return route.fulfill({ status: 404 });
      }
    });
    await context.addInitScript(installWebExtensionStub, { messages });
    await use(context);
  },

  open: async ({ context }, use) => {
    await use(async (file) => {
      const page = await context.newPage();
      /** @type {string[]} */
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') {
          errors.push(message.text());
        }
      });
      await page.goto(`${ORIGIN}/${file}`);
      await page.locator('main').waitFor();
      expect(errors).toEqual([]);
      return page;
    });
  },
});

/**
 * @param {import('@playwright/test').Page} page Page.
 * @returns {Promise<{ sentMessages: unknown[], openedOptions: number, clipboardWrites: string[] }>} Recorded calls.
 */
const recorded = (page) => page.evaluate(() => /** @type {any} */ (globalThis).__webextRecord);

test('the Firefox manifest is valid MV3 with Gecko settings and only the storage permission', ({ pagesPath }) => {
  const manifest = JSON.parse(readFileSync(resolve(pagesPath, 'manifest.json'), 'utf8'));
  expect(manifest.manifest_version).toBe(3);
  expect(manifest.background).toBeUndefined();
  expect(manifest.permissions).toEqual(['storage']);
  expect(manifest.browser_specific_settings.gecko.id).toBeTruthy();
  expect(manifest.browser_specific_settings.gecko.data_collection_permissions).toEqual({ required: ['none'] });
});

test('popup generates and copies without messaging anything else', async ({ open }) => {
  const popup = await open('popup.html');
  const secret = popup.getByTestId('secret');
  await expect(secret).toHaveText(/^.{20}$/);
  await expect(popup.getByTestId('strength')).toHaveAttribute('data-score', '4');

  const value = await secret.textContent();
  await popup.getByTestId('copy').click();
  await expect(popup.getByTestId('copy')).toHaveAttribute('data-state', 'copied');
  const calls = await recorded(popup);
  expect(calls.clipboardWrites).toEqual([value]);
  expect(calls.sentMessages).toEqual([]);

  await popup.getByTestId('regenerate').click();
  await expect(secret).not.toHaveText(value ?? '');
});

test('popup passphrase mode and options work', async ({ open }) => {
  const popup = await open('popup.html');
  await popup.getByTestId('mode-passphrase').click();
  await popup.getByTestId('words-input').fill('4');
  await popup.getByTestId('words-input').press('Tab');
  await popup.getByTestId('separator').selectOption('.');
  await popup.getByTestId('include-number').uncheck();
  await expect(popup.getByTestId('secret')).toHaveText(/^[A-Z][a-z-]+(\.[A-Z][a-z-]+){3}$/);
});

test('options page enables history with a not-synced warning, and the popup uses it', async ({ open }) => {
  const options = await open('options.html');
  await expect(options.getByTestId('shortcut')).toContainText('Alt+Shift+G');
  await expect(options.getByTestId('history-not-synced')).toHaveCount(0);
  await options.getByTestId('history-enabled').check();
  await expect(options.getByTestId('history-not-synced')).toBeVisible();

  const popup = await open('popup.html');
  const value = (await popup.getByTestId('secret').textContent()) ?? '';
  await popup.getByTestId('copy').click();
  await expect(popup.getByTestId('history')).toContainText(value);
});

test('pages have no detectable accessibility violations', async ({ open }) => {
  for (const file of ['popup.html', 'options.html']) {
    const page = await open(file);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, file).toEqual([]);
  }
});
