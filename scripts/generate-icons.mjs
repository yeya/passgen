/**
 * Renders src/assets/icon.svg to the PNG sizes the browsers need, using the
 * Playwright Chromium that the test suite already depends on.
 *
 * Usage: npm run icons
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('..', import.meta.url));
const svg = await readFile(`${root}src/assets/icon.svg`, 'utf8');
const sizes = [16, 32, 48, 96, 128];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined });
try {
  for (const size of sizes) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{width:${size}px;height:${size}px;display:block}</style>${svg}`,
    );
    await page.screenshot({ path: `${root}public/icon/${size}.png`, omitBackground: true });
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(`Wrote ${sizes.length} icons to public/icon/`);
