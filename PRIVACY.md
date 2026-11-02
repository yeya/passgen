# Privacy policy

PassGen does not collect, transmit, sell or share any data.

- **No network access.** The extension makes no network requests of any kind: no analytics, telemetry, error
  reporting or remote code.
- **Settings** (length, character sets, word count and so on) are saved with the browser's
  `storage.sync` API. If you are signed in to your browser with sync turned on, your browser vendor syncs them between
  your devices. Settings never contain passwords.
- **Generated passwords** are not stored. The only exception is the optional history (off by default): it keeps copied
  passwords in the browser's in-memory `storage.session`. It is never synced, never written to disk, and is erased when
  you turn history off, click "Clear history", or close the browser.
- **Clipboard.** PassGen writes to the clipboard only when you click Copy. It never reads or clears the clipboard.
- **Web pages.** PassGen has no access to the websites you visit.
