/**
 * Clipboard handling.
 */

/**
 * Copies text to the clipboard. Must be called from a user gesture in a
 * focused page such as the popup.
 *
 * @param {string} text Text to copy.
 * @returns {Promise<void>}
 */
export async function copyText(text) {
  await navigator.clipboard.writeText(text);
}
