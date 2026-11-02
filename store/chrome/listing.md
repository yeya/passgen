# Chrome Web Store listing

## Summary (from the manifest, max 132 characters)

Strong, random passwords and passphrases in one click. Offline, private, no accounts.

## Description

PassGen creates strong, truly random passwords and memorable passphrases right from your toolbar. No account, no cloud, no tracking.

★ ONE CLICK, OR NO CLICKS
Press Alt+Shift+G to open PassGen, then Enter to copy. A fresh password is on your clipboard before you can blink.

★ PASSWORDS YOUR WAY
• 4 to 128 characters
• Uppercase, lowercase, digits and symbols: every type you enable is guaranteed to appear
• Avoid look-alike characters (I, l, 1, O, 0) for passwords you need to read or type
• Set your own symbol list for sites that only accept certain symbols

★ PASSPHRASES YOU CAN REMEMBER
• 3 to 20 random words from the EFF word list (7,776 words)
• Choose the separator, capitalize words, add a number
• Six words give about 80 bits of entropy, which is easy to type and very hard to guess

★ HONEST STRENGTH METER
Shows the exact entropy in bits for your settings, with a clear Very weak to Very strong rating.

★ PRIVATE BY DESIGN
• Works completely offline: no network requests, no analytics, no ads
• Only one permission (storage), with no access to the websites you visit
• Randomness comes from your browser's cryptographically secure generator (crypto.getRandomValues), with no bias
• Open source, so anyone can check the code

★ YOUR SETTINGS, EVERYWHERE
Your preferences sync across your devices through your browser account. An optional history of copied passwords is off by default; if you turn it on, it stays on this device and is never synced.

★ ACCESSIBLE
Works fully with the keyboard and screen readers, and supports light and dark mode.

## Category

Tools

## Language

English

## URLs

- Official URL / homepage: https://github.com/yeya/passgen
- Support URL: https://github.com/yeya/passgen/issues
- Privacy policy: https://github.com/yeya/passgen/blob/main/PRIVACY.md

## Privacy practices tab

- Single purpose: Generate random passwords and passphrases and copy them to the clipboard.
- Permission justification for `storage`: Saves the user's generator settings (synced through the browser account) and,
  only if the user turns it on, a local history of copied passwords.
- Remote code: No, I am not using remote code.
- Data usage: no data is collected. Tick the three certifications (not sold, not used for unrelated purposes, not used
  for creditworthiness).

## Assets

- Store icon: `icon-128.png` (96×96 artwork with 16 px transparent padding)
- Screenshots (1280×800): `screenshot-1.png` … `screenshot-4.png`

Regenerate the images after UI changes with `npm run build && npm run store-assets`.
