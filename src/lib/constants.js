/**
 * Shared constants with no dependencies, safe to import from the background
 * script without pulling in the generators or the word list.
 */

/** Allowed delays (seconds) before the clipboard is cleared. 0 means never. Browsers enforce a 30 s minimum for alarms. */
export const CLIPBOARD_CLEAR_OPTIONS = Object.freeze([0, 30, 60, 120, 300]);

/** How many entries the history keeps at most. */
export const HISTORY_LIMIT = 20;
