import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { test as base, chromium } from '@playwright/test';

/**
 * Fixtures that launch Chromium with the built extension loaded.
 *
 * @type {import('@playwright/test').TestType<
 *   import('@playwright/test').PlaywrightTestArgs & import('@playwright/test').PlaywrightTestOptions & {
 *     extensionId: string,
 *     readStorage: () => Promise<{ sync: Record<string, any>, local: Record<string, any>, session: Record<string, any> }>,
 *     openPopup: () => Promise<import('@playwright/test').Page>,
 *     openOptions: () => Promise<import('@playwright/test').Page>,
 *   },
 *   import('@playwright/test').PlaywrightWorkerArgs & import('@playwright/test').PlaywrightWorkerOptions & {
 *     extensionPath: string,
 *   }
 * >}
 */
export const test = base.extend({
  extensionPath: ['.output/chrome-mv3', { option: true, scope: 'worker' }],

  // Each test gets a fresh browser profile with the extension installed.
  context: async ({ extensionPath, launchOptions }, use) => {
    const path = resolve(extensionPath);
    const context = await chromium.launchPersistentContext('', {
      ...launchOptions,
      channel: 'chromium',
      args: [`--disable-extensions-except=${path}`, `--load-extension=${path}`],
    });
    await use(context);
    await context.close();
  },

  // Chromium derives an unpacked extension's id from its absolute path:
  // SHA-256 of the path, first 32 hex digits mapped from 0-f to a-p.
  extensionId: async ({ extensionPath }, use) => {
    const hex = createHash('sha256')
      .update(realpathSync(resolve(extensionPath)))
      .digest('hex')
      .slice(0, 32);
    await use([...hex].map((c) => String.fromCharCode(97 + Number.parseInt(c, 16))).join(''));
  },

  // Reads every storage area from an extension page, as the extension sees it.
  readStorage: async ({ context, extensionId }, use) => {
    await use(async () => {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/options.html`);
      const result = await page.evaluate(async () => ({
        sync: await chrome.storage.sync.get(null),
        local: await chrome.storage.local.get(null),
        session: await chrome.storage.session.get(null),
      }));
      await page.close();
      return result;
    });
  },

  openPopup: async ({ context, extensionId }, use) => {
    await use(async () => {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/popup.html`);
      await page.getByTestId('secret').waitFor();
      return page;
    });
  },

  openOptions: async ({ context, extensionId }, use) => {
    await use(async () => {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/options.html`);
      await page.getByTestId('history-enabled').waitFor();
      return page;
    });
  },
});

export { expect } from '@playwright/test';
