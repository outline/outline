/**
 * jsdom does not implement web storage, so these in-memory stand-ins let the
 * shared tests that exercise persistence run under jsdom. Each call returns a
 * fresh store so localStorage and sessionStorage stay independent.
 */
function createStorage(): Storage {
  const data = new Map<string, string>();

  return {
    get length() {
      return data.size;
    },
    key: (index: number) => [...data.keys()][index] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, String(value));
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => {
      data.clear();
    },
  };
}

global.localStorage = createStorage();
global.sessionStorage = createStorage();

export {};
