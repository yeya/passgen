/**
 * Small helpers for reading form events in templates without type casts.
 */

/**
 * @param {Event} event A `change` event from a checkbox.
 * @returns {boolean} Whether the checkbox is checked.
 */
export function checkedOf(event) {
  return /** @type {HTMLInputElement} */ (event.target).checked;
}

/**
 * @param {Event} event An `input`/`change` event from an input or select.
 * @returns {string} The control's value.
 */
export function valueOf(event) {
  return /** @type {HTMLInputElement | HTMLSelectElement} */ (event.target).value;
}
