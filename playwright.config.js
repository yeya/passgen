import { defineConfig, devices } from '@playwright/test';

const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || undefined;

/**
 * Projects:
 * - chrome / edge: load the real built extension (.output/<browser>-mv3) into Chromium.
 *   Edge is Chromium-based and runs the same engine; this verifies the Edge build.
 * - firefox-pages / chromium-pages: open the built Firefox extension pages in Firefox (Gecko)
 *   with an in-memory WebExtension API stub. Playwright cannot install add-ons into Firefox,
 *   so this covers rendering and behavior on Gecko; `npm run lint:firefox` validates the package.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chrome',
      testMatch: 'extension.spec.js',
      use: { extensionPath: '.output/chrome-mv3', launchOptions: { executablePath } },
    },
    {
      name: 'edge',
      testMatch: 'extension.spec.js',
      use: { extensionPath: '.output/edge-mv3', launchOptions: { executablePath } },
    },
    {
      name: 'firefox-pages',
      testMatch: 'pages.spec.js',
      use: { ...devices['Desktop Firefox'], pagesPath: '.output/firefox-mv3' },
    },
    {
      name: 'chromium-pages',
      testMatch: 'pages.spec.js',
      use: { ...devices['Desktop Chrome'], pagesPath: '.output/firefox-mv3', launchOptions: { executablePath } },
    },
  ],
});
