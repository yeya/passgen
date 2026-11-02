/**
 * A small in-memory WebExtension API used to run the built extension pages in
 * browsers where Playwright cannot install the add-on (Firefox).
 *
 * The function is serialized and injected with `page.addInitScript`, so it
 * must be self-contained. Storage is backed by `localStorage`, so pages on the
 * same origin share it and receive `onChanged` events from each other, as
 * they would in a real extension.
 *
 * @param {{ messages: Record<string, { message: string, placeholders?: Record<string, { content: string }> }> }} config
 *   Locale messages.
 */
export function installWebExtensionStub({ messages }) {
  const EXTENSION_ID = 'passgen-test@example';
  /** @type {{ sentMessages: unknown[], openedOptions: number, clipboardWrites: string[] }} */
  const record = { sentMessages: [], openedOptions: 0, clipboardWrites: [] };

  /**
   * @returns {{
   *   add: (fn: (...args: unknown[]) => void) => void,
   *   remove: (fn: (...args: unknown[]) => void) => void,
   *   emit: (...args: unknown[]) => void,
   * }} Event.
   */
  const createEvent = () => {
    const listeners = new Set();
    return {
      add: (fn) => listeners.add(fn),
      remove: (fn) => listeners.delete(fn),
      emit: (...args) => listeners.forEach((fn) => fn(...args)),
    };
  };

  const globalChanged = createEvent();

  /**
   * @param {string} name Area name.
   * @returns {object} Storage area.
   */
  const createArea = (name) => {
    const key = `__webext_storage_${name}`;
    const read = () => JSON.parse(localStorage.getItem(key) ?? '{}');
    const changed = createEvent();
    /**
     * @param {Record<string, unknown>} before Old data.
     * @param {Record<string, unknown>} after New data.
     */
    const notify = (before, after) => {
      /** @type {Record<string, { oldValue?: unknown, newValue?: unknown }>} */
      const changes = {};
      for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
        if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
          changes[k] = { oldValue: before[k], newValue: after[k] };
        }
      }
      if (Object.keys(changes).length > 0) {
        changed.emit(changes);
        globalChanged.emit(changes, name);
      }
    };
    /** @param {Record<string, unknown>} data New data. */
    const write = (data) => {
      const before = read();
      localStorage.setItem(key, JSON.stringify(data));
      notify(before, data);
    };
    window.addEventListener('storage', (event) => {
      if (event.key === key) {
        notify(JSON.parse(event.oldValue ?? '{}'), JSON.parse(event.newValue ?? '{}'));
      }
    });
    return {
      async get(keys) {
        const data = read();
        if (keys === null || keys === undefined) {
          return data;
        }
        /** @type {string[]} */
        let list;
        if (typeof keys === 'string') {
          list = [keys];
        } else if (Array.isArray(keys)) {
          list = keys;
        } else {
          list = Object.keys(keys);
        }
        return Object.fromEntries(list.filter((k) => k in data).map((k) => [k, data[k]]));
      },
      async set(items) {
        write({ ...read(), ...JSON.parse(JSON.stringify(items)) });
      },
      async remove(keys) {
        const data = read();
        for (const k of [keys].flat()) {
          delete data[k];
        }
        write(data);
      },
      async clear() {
        write({});
      },
      onChanged: { addListener: changed.add, removeListener: changed.remove, hasListener: () => false },
    };
  };

  /**
   * @param {string} key Message name.
   * @param {string | string[]} [substitutions] Values.
   * @returns {string} Localized message.
   */
  const getMessage = (key, substitutions) => {
    if (key === '@@bidi_dir') {
      return 'ltr';
    }
    const entry = messages[key];
    if (!entry) {
      return '';
    }
    const subs = substitutions === undefined ? [] : [substitutions].flat();
    return entry.message.replace(/\$([A-Za-z0-9_]+)\$/g, (_, name) => {
      const index = Number(entry.placeholders?.[name.toLowerCase()]?.content.replace('$', '')) - 1;
      return subs[index] ?? '';
    });
  };

  const browser = {
    runtime: {
      id: EXTENSION_ID,
      getURL: (path) => new URL(path, location.origin).href,
      async sendMessage(message) {
        record.sentMessages.push(message);
        return true;
      },
      async openOptionsPage() {
        record.openedOptions += 1;
      },
      onMessage: { addListener() {}, removeListener() {} },
    },
    storage: {
      sync: createArea('sync'),
      local: createArea('local'),
      session: createArea('session'),
      onChanged: { addListener: globalChanged.add, removeListener: globalChanged.remove },
    },
    i18n: { getMessage, getUILanguage: () => 'en' },
    commands: { getAll: async () => [{ name: '_execute_action', shortcut: 'Alt+Shift+G' }] },
    alarms: { create() {}, clear: async () => true, onAlarm: { addListener() {} } },
  };

  // Record clipboard writes; Playwright cannot read the Firefox clipboard.
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      async writeText(text) {
        record.clipboardWrites.push(text);
      },
    },
  });

  Object.defineProperty(globalThis, 'browser', { value: browser, configurable: true });
  Object.defineProperty(globalThis, '__webextRecord', { value: record, configurable: true });
}
