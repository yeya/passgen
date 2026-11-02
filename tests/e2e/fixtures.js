import { resolve } from 'node:path';
import { test as base, chromium } from '@playwright/test';

/**
 * Fixtures that launch Chromium with the built extension loaded.
 *
 * @type {import('@playwright/test').TestType<
 *   import('@playwright/test').PlaywrightTestArgs & import('@playwright/test').PlaywrightTestOptions & {
 *     extensionId: string,
 *     serviceWorker: import('@playwright/test').Worker,
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

  serviceWorker: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    worker ??= await context.waitForEvent('serviceworker');
    await use(worker);
  },

  extensionId: async ({ serviceWorker }, use) => {
    await use(new URL(serviceWorker.url()).host);
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
      await page.getByTestId('clipboard-clear').waitFor();
      return page;
    });
  },
});

export { expect } from '@playwright/test';
