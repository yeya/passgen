import { defineConfig } from 'wxt';

const ICONS = { 16: 'icon/16.png', 32: 'icon/32.png', 48: 'icon/48.png', 96: 'icon/96.png', 128: 'icon/128.png' };

// https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-vue'],
  manifestVersion: 3,
  manifest: ({ browser }) => ({
    name: '__MSG_extName__',
    short_name: '__MSG_extShortName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    icons: ICONS,
    action: { default_icon: ICONS, default_title: '__MSG_extShortName__' },
    // storage: settings and session-only history. alarms: delayed clipboard
    // clearing. clipboardWrite: clear the clipboard from the background.
    // offscreen (Chromium only): DOM access for clearing the clipboard.
    // None of these trigger an install-time permission warning.
    permissions: ['storage', 'alarms', 'clipboardWrite', ...(browser === 'firefox' ? [] : ['offscreen'])],
    commands: {
      _execute_action: {
        suggested_key: { default: 'Alt+Shift+G' },
        description: '__MSG_commandOpenPopup__',
      },
    },
    content_security_policy: {
      extension_pages:
        "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    },
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: 'passgen@yeya.github.io',
              strict_min_version: '140.0',
              data_collection_permissions: { required: ['none'] },
            },
            gecko_android: { strict_min_version: '142.0' },
          },
        }
      : { minimum_chrome_version: '120' }),
  }),
});
