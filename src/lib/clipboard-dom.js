/**
 * Clears the system clipboard from a DOM document that has the
 * `clipboardWrite` permission (Chrome offscreen document or Firefox
 * background page). Neither context has focus, so the async Clipboard API
 * is not available there; `execCommand('copy')` is.
 *
 * @param {Document} doc Document to run the copy command in.
 * @returns {boolean} Whether the browser reported success.
 */
export function clearClipboardInDocument(doc) {
  /**
   * @param {ClipboardEvent} event Copy event.
   */
  const onCopy = (event) => {
    event.preventDefault();
    event.clipboardData?.setData('text/plain', '');
  };
  // A selection is required for the copy command to fire in some browsers.
  const textarea = doc.createElement('textarea');
  textarea.value = ' ';
  textarea.setAttribute('readonly', '');
  doc.body.append(textarea);
  textarea.select();
  doc.addEventListener('copy', onCopy);
  try {
    return doc.execCommand('copy');
  } finally {
    doc.removeEventListener('copy', onCopy);
    textarea.remove();
  }
}
