/**
 * Generates Chrome Web Store assets from the real built extension:
 * - store/chrome/icon-128.png      (96×96 artwork with 16 px transparent padding, per store guidelines)
 * - store/chrome/screenshot-N.png  (1280×800)
 *
 * Usage: npm run build && npm run store-assets
 */
import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = `${root}store/chrome`;
const extensionPath = await realpath(`${root}.output/chrome-mv3`);
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || undefined;
const svg = await readFile(`${root}src/assets/icon.svg`, 'utf8');

// Unpacked extension id = first 32 hex digits of SHA-256(path), mapped 0-f → a-p.
const hex = createHash('sha256').update(extensionPath).digest('hex').slice(0, 32);
const id = [...hex].map((c) => String.fromCharCode(97 + Number.parseInt(c, 16))).join('');

// Extension pages are captured at 2× from a profile with the extension loaded;
// slides and the icon are composed in a separate browser at exact pixel sizes.
const context = await chromium.launchPersistentContext('', {
  channel: 'chromium',
  executablePath,
  deviceScaleFactor: 2,
  args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
});
const browser = await chromium.launch({ executablePath });
const composer = await browser.newContext({ deviceScaleFactor: 1 });

/**
 * Captures the popup (or options page) as a high-resolution PNG data URL.
 *
 * @param {{ page: string, scheme: 'light' | 'dark', width: number, setup?: (page: import('@playwright/test').Page) => Promise<void>, clip?: string }} options Capture options.
 * @returns {Promise<string>} PNG data URL.
 */
async function capture({ page: file, scheme, width, setup, clip = 'main' }) {
  const page = await context.newPage();
  await page.emulateMedia({ colorScheme: scheme });
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`chrome-extension://${id}/${file}`);
  await page.locator('main').waitFor();
  await setup?.(page);
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  const png = await page.locator(clip).screenshot();
  await page.close();
  return `data:image/png;base64,${png.toString('base64')}`;
}

/**
 * Renders one 1280×800 store screenshot.
 *
 * @param {string} name Output file name.
 * @param {{ title: string, text: string, bullets?: string[], images: { src: string, width: number, dark?: boolean }[], dark?: boolean }} slide Content.
 */
async function slide(name, { title, text, bullets = [], images, dark = false }) {
  const page = await composer.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.setContent(`<!doctype html><html><head><style>
    * { box-sizing: border-box; }
    body { margin: 0; width: 1280px; height: 800px; overflow: hidden; display: flex; align-items: center; gap: 56px;
      padding: 0 72px; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      background: ${dark ? 'radial-gradient(circle at 80% 30%, #2a3170, #11131a 70%)' : 'radial-gradient(circle at 80% 30%, #e3e8ff, #f7f8fc 70%)'};
      color: ${dark ? '#eceef3' : '#16181d'}; }
    .copy { flex: 1; min-width: 0; }
    .brand { display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 22px; margin-bottom: 36px; }
    .brand svg { width: 44px; height: 44px; }
    h1 { font-size: 50px; line-height: 1.1; margin: 0 0 20px; letter-spacing: -0.02em; }
    p { font-size: 22px; line-height: 1.5; margin: 0; color: ${dark ? '#a3a9b7' : '#5b6170'}; }
    ul { list-style: none; padding: 0; margin: 28px 0 0; display: grid; gap: 12px; font-size: 20px; }
    li { display: flex; gap: 12px; align-items: center; }
    li::before { content: ''; width: 10px; height: 10px; border-radius: 50%; background: #4a64f0; flex: none; }
    .shots { display: flex; gap: 28px; align-items: center; }
    .shots img { border-radius: 14px; box-shadow: 0 24px 60px rgb(20 30 80 / ${dark ? '55%' : '22%'}), 0 0 0 1px rgb(0 0 0 / 8%); }
  </style></head><body>
    <div class="copy">
      <div class="brand">${svg}PassGen</div>
      <h1>${title}</h1>
      <p>${text}</p>
      ${bullets.length > 0 ? `<ul>${bullets.map((b) => `<li>${b}</li>`).join('')}</ul>` : ''}
    </div>
    <div class="shots">${images.map((img) => `<img src="${img.src}" style="width:${img.width}px">`).join('')}</div>
  </body></html>`);
  await page.waitForFunction(() => [...document.images].every((img) => img.complete));
  await page.screenshot({ path: `${out}/${name}` });
  await page.close();
}

// Store icon: 96×96 artwork centered in a transparent 128×128 canvas.
{
  const page = await composer.newPage();
  await page.setViewportSize({ width: 128, height: 128 });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{width:96px;height:96px;margin:16px;display:block}</style>${svg}`,
  );
  await page.screenshot({ path: `${out}/icon-128.png`, omitBackground: true });
  await page.close();
}

const passwordLight = await capture({ page: 'popup.html', scheme: 'light', width: 360 });
const passphraseDark = await capture({
  page: 'popup.html',
  scheme: 'dark',
  width: 360,
  setup: async (page) => {
    await page.getByTestId('mode-passphrase').click();
  },
});
const passphraseLight = await capture({
  page: 'popup.html',
  scheme: 'light',
  width: 360,
  setup: async (page) => {
    await page.getByTestId('mode-passphrase').click();
  },
});
const passwordDark = await capture({
  page: 'popup.html',
  scheme: 'dark',
  width: 360,
  setup: async (page) => {
    await page.getByTestId('mode-password').click();
    await page.getByTestId('exclude-ambiguous').check();
  },
});
const settings = await capture({ page: 'options.html', scheme: 'light', width: 700 });

await slide('screenshot-1.png', {
  title: 'Strong passwords in one click',
  text: 'Press Alt+Shift+G, then Enter. A fresh, truly random password is on your clipboard.',
  bullets: ['Up to 128 characters', 'Choose letters, digits and symbols', 'Exact strength in bits'],
  images: [{ src: passwordLight, width: 400 }],
});
await slide('screenshot-2.png', {
  title: 'Passphrases you can actually remember',
  text: 'Random words from the EFF word list: easy to type, hard to guess.',
  bullets: ['3 to 20 words', 'Your choice of separator', 'Optional capitals and a number'],
  images: [{ src: passphraseDark, width: 400 }],
  dark: true,
});
await slide('screenshot-3.png', {
  title: 'Private by design',
  text: 'PassGen works entirely offline. No account, no tracking, no access to the sites you visit.',
  bullets: ['Only one permission: storage', 'Cryptographically secure randomness', 'Open source on GitHub'],
  images: [
    { src: passwordDark, width: 330 },
    { src: passphraseLight, width: 330 },
  ],
});
await slide('screenshot-4.png', {
  title: 'Settings that follow you',
  text: 'Your preferences sync across your devices through your browser account.',
  bullets: ['Custom symbol set for picky sites', 'Optional history, off by default', 'Light and dark mode'],
  images: [{ src: settings, width: 560 }],
});

await context.close();
await browser.close();
console.log(`Wrote store assets to ${out}`);
