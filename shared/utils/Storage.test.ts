import { Storage } from "./Storage";

// Shared tests run in both node and jsdom; web storage only exists in jsdom.
const hasStorage = typeof window !== "undefined";

describe.runIf(hasStorage)("Storage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("stores and retrieves values", () => {
    const storage = new Storage("local");
    storage.set("key", "value");
    expect(storage.get("key")).toBe("value");
  });

  it("falls back to session storage when a write fails", () => {
    const storage = new Storage("local");
    const primary = storage.interface;
    storage.interface = {
      getItem: (key: string) => primary.getItem(key),
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: (key: string) => primary.removeItem(key),
      clear: () => primary.clear(),
    } as unknown as typeof localStorage;

    storage.set("toggle:1", { fold: false });

    // The value survived in session storage, and reads prefer the fallback
    // copy as it is the most recent successful write.
    expect(sessionStorage.getItem("toggle:1")).toBe(
      JSON.stringify({ fold: false })
    );
    expect(storage.get("toggle:1")).toEqual({ fold: false });

    // A later successful write removes the fallback copy so reads of the key
    // stay consistent.
    storage.interface = primary;
    storage.set("toggle:1", { fold: true });
    expect(sessionStorage.getItem("toggle:1")).toBeNull();
    expect(storage.get("toggle:1")).toEqual({ fold: true });
  });

  it("removes values from both interfaces", () => {
    const storage = new Storage("local");
    storage.set("key", "value");
    sessionStorage.setItem("key", JSON.stringify("value"));

    storage.remove("key");
    expect(localStorage.getItem("key")).toBeNull();
    expect(sessionStorage.getItem("key")).toBeNull();
  });

  it("clears only the keys written by this instance", () => {
    const storage = new Storage("local");
    const primary = storage.interface;
    storage.interface = {
      getItem: (key: string) => primary.getItem(key),
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: (key: string) => primary.removeItem(key),
      clear: () => primary.clear(),
    } as unknown as typeof localStorage;

    storage.set("toggle:1", { fold: false });
    storage.interface = primary;
    sessionStorage.setItem("unrelated", "keep");

    storage.clear();
    expect(storage.get("toggle:1")).toBeUndefined();
    expect(sessionStorage.getItem("toggle:1")).toBeNull();
    // Session storage is shared with unrelated features and is left alone.
    expect(sessionStorage.getItem("unrelated")).toBe("keep");
  });
});
