/**
 * Message types exchanged between extension contexts.
 */
export const MESSAGES = Object.freeze({
  /** Popup → background: schedule clearing the clipboard. Payload: `{ seconds: number }`. */
  SCHEDULE_CLIPBOARD_CLEAR: 'passgen:schedule-clipboard-clear',
  /** Background → offscreen document: clear the clipboard now. */
  OFFSCREEN_CLEAR_CLIPBOARD: 'passgen:offscreen-clear-clipboard',
});

/** Name of the alarm that clears the clipboard. */
export const CLIPBOARD_ALARM = 'passgen:clear-clipboard';
