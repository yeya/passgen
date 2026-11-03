# PassGen

A fast, secure password and passphrase generator for **Chrome**, **Edge** and **Firefox**. Strong, customizable
secrets right from your browser toolbar: no accounts, no cloud, no network requests.

## Features

- **Passwords**: 4–128 characters; uppercase, lowercase, digits and symbols. Every enabled set is always present.
  Optional "avoid look-alike characters" (`I l 1 O 0 …`) and a custom symbol set for sites with picky rules.
- **Passphrases**: 3–20 words from the [EFF large word list](https://www.eff.org/dice) (7,776 words). Choice of
  separator, optional capitalization and a random digit.
- **Exact strength meter**: entropy in bits, computed exactly for the options chosen, plus a 5-level rating.
- **One-click copy**: nothing else touches your clipboard.
- **Keyboard first**: `Alt+Shift+G` opens the popup with **Copy** focused, so you press `Enter` and paste.
- **Settings sync** across your devices through the browser's built-in `storage.sync`.
- **History (opt-in, off by default)**: copied secrets are saved in `storage.local` on this device, kept across browser
  restarts until you clear them or turn history off. It is never synced. The settings page warns that it is stored
  unencrypted and is not synced.
- **Light and dark mode**, screen reader and keyboard accessible (checked with axe), ready for translation including
  right-to-left languages.

## Security design

| Concern        | Approach                                                                                                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Randomness     | `crypto.getRandomValues` only, with rejection sampling: no modulo bias. `Math.random` is banned by lint.                                                                      |
| Uniform output | Passwords are drawn uniformly over the whole pool and redrawn until every required set appears. The result is uniform over valid passwords, so the reported entropy is exact. |
| Permissions    | `storage` only, which shows no install warning. No background script, no host permissions, no content scripts, no access to the pages you visit.                              |
| Network        | None. A strict CSP (`default-src 'self'`) blocks remote code, and an end-to-end test asserts zero network requests.                                                           |
| Storage        | Only settings are stored (synced). Secrets are stored only if you turn on history, and then only on this device (`storage.local`, not encrypted).                             |
| Word list      | Vendored, and a unit test verifies its SHA-256 against the official EFF file.                                                                                                 |

See [PRIVACY.md](PRIVACY.md) for the privacy policy.

## Browser support

| Browser | Minimum version | Notes                          |
| ------- | --------------- | ------------------------------ |
| Chrome  | 120             |                                |
| Edge    | 120             | Same Chromium build as Chrome. |
| Firefox | 140 (ESR)       |                                |

## Development

Requires Node.js 22 or newer.

```bash
npm install
```

```bash
npm run dev            # Chrome with hot reload
```

```bash
npm run dev:firefox    # Firefox with hot reload
```

| Script                  | What it does                                                     |
| ----------------------- | ---------------------------------------------------------------- |
| `npm run build:all`     | Builds `.output/chrome-mv3`, `edge-mv3` and `firefox-mv3`        |
| `npm run zip:all`       | Store-ready zips (plus the sources zip that Mozilla requires)    |
| `npm run lint`          | ESLint (strict, JSDoc required) and Prettier                     |
| `npm run lint:firefox`  | Builds for Firefox and runs Mozilla's `web-ext lint`             |
| `npm test`              | Vitest unit and component tests                                  |
| `npm run test:coverage` | The same with coverage, which must stay at or above 90% of lines |
| `npm run test:e2e`      | Playwright end-to-end tests (run `build:all` first)              |
| `npm run check`         | Everything CI runs                                               |
| `npm run icons`         | Re-renders `public/icon/*.png` from `src/assets/icon.svg`        |

### Releasing

```bash
npm version minor        # or patch / major: bumps package.json, commits and tags vX.Y.Z
```

```bash
git push --follow-tags
```

Alternatively, bump `version` in `package.json` on `main` and use **Actions → Release → Run workflow**; it creates the
`vX.Y.Z` tag itself. Either way, the `Release` workflow runs the full CI and then publishes a GitHub Release with the Chrome, Edge and Firefox zips
(plus the sources zip that Mozilla requires). It fails if the tag does not match the `package.json` version.

### Publishing to the Chrome Web Store

After the GitHub release is created, the `Submit to Chrome Web Store` job uploads that release's Chrome zip with
`wxt submit` (Chrome Web Store API v2) and submits it for review. It is skipped until it is configured:

1. Register a developer account at the [Chrome Web Store dashboard](https://chrome.google.com/webstore/devconsole)
   (one-time fee), then upload the first version **by hand** and fill in the store listing. The API can only update an
   item that already exists.
2. Create a Google Cloud service account for the Chrome Web Store API, following
   [Google's guide](https://developer.chrome.com/docs/webstore/service-accounts). Download its JSON key and add the
   service account's email to your publisher in the dashboard.
3. In GitHub → Settings:
   - **Variables** (repository): `CHROME_EXTENSION_ID` (the item ID from the dashboard) and `CHROME_PUBLISHER_ID`
     (from the dashboard URL, `…/devconsole/<publisher-id>`).
   - **Environments** → create `chrome-web-store`, add the secrets `CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL` and
     `CHROME_SERVICE_ACCOUNT_PRIVATE_KEY` (the `client_email` and `private_key` fields of the JSON key). Optionally add
     yourself as a required reviewer so every submission waits for your approval.

Each release needs a higher version than the one in the store.

### Publishing to Firefox Add-ons

The `Submit to Firefox Add-ons` job uploads the release's Firefox zip and sources zip to addons.mozilla.org (listed
channel). It is skipped until it is configured:

1. Submit the first version **by hand** at the [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/).
2. Create API credentials at [Manage API Keys](https://addons.mozilla.org/developers/addon/api/key/).
3. In GitHub → Settings:
   - **Variables** (repository): `FIREFOX_EXTENSION_ID`, the value in the Developer Hub edit URL
     (`…/developers/addon/<extension-id>/edit`).
   - **Environments** → create `firefox-add-ons`, add the secrets `FIREFOX_JWT_ISSUER` and `FIREFOX_JWT_SECRET` (the
     JWT issuer and JWT secret from the API key page). Optionally add yourself as a required reviewer.

### Loading the extension manually

- **Chrome / Edge**: open `chrome://extensions` or `edge://extensions`, turn on _Developer mode_, click _Load unpacked_
  and choose `.output/chrome-mv3` (or `edge-mv3`).
- **Firefox**: open `about:debugging#/runtime/this-firefox`, click _Load Temporary Add-on_ and choose
  `.output/firefox-mv3/manifest.json`.

### Tech stack

- [WXT](https://wxt.dev) builds and packages for each browser (Vite under the hood).
- [Vue 3](https://vuejs.org) (`<script setup>`) for the UI.
- **Plain JavaScript with JSDoc**. Types are documented in JSDoc, `jsconfig.json` gives editor type checking, and
  ESLint enforces JSDoc on every function.

### Project layout

```
src/
  entrypoints/      popup and options page
  components/       Vue components
  composables/      useSettings (persisted, live-synced), useGenerator
  lib/              framework-free core: random, password, passphrase, strength, settings, history, clipboard, i18n
public/
  _locales/en/      UI strings (add a folder to add a language)
  icon/             toolbar and store icons
tests/
  unit/             Vitest tests (happy-dom + WXT fake browser)
  e2e/              Playwright tests
```

## Testing strategy

- **Unit (Vitest)**: the generators are checked with chi-square uniformity tests, a brute-force check of the entropy
  formula, rejection-sampling behavior, settings validation against tampered storage, the storage area used
  (sync vs local).
- **Component (Vitest + Vue Test Utils)**: every component, the popup and the options page, including the
  history-not-synced warning.
- **End-to-end (Playwright)**:
  - `chrome` and `edge`: load the real built extension into Chromium. They test copying with the keyboard, real
    the real clipboard, that the Copy button and popup never change size, persistence, that history stays only in `storage.local`,
    that there are no network requests, and run axe accessibility scans.
  - `firefox-pages`: runs the built Firefox pages in Gecko with an in-memory WebExtension API stub. Playwright cannot
    install add-ons into Firefox; `web-ext lint` validates the Firefox package itself.
  - `chromium-pages`: the same spec in Chromium, so it can run where Firefox is not installed.

To run the tests with a Chromium that is already installed, set `CHROMIUM_EXECUTABLE_PATH`.

## Roadmap

- **Fill the password into the page** (right-click → "Fill generated password"). Planned if there is enough demand;
  it needs the `contextMenus`, `activeTab` and `scripting` permissions, so it was left out of the first version to keep
  permissions minimal. Please upvote the issue if you want it.

## License

[MIT](LICENSE). The EFF word list is © Electronic Frontier Foundation, [CC BY 3.0 US](https://creativecommons.org/licenses/by/3.0/us/).
