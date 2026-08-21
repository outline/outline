import type { Primitive } from "utility-types";

/**
 * Storage is a wrapper class for web storage that allows safe usage when
 * localStorage or sessionStorage are not available.
 */
export class Storage {
  interface: typeof localStorage | MemoryStorage;

  // Used when a write to the primary interface fails at runtime, e.g. when
  // the local storage quota has been exceeded.
  fallbackInterface: typeof sessionStorage | null = null;

  /**
   * @param type whether to persist for the session only, or indefinitely.
   */
  public constructor(type: "local" | "session" = "local") {
    try {
      // Avoid touching the storage globals outside the browser; in Node they
      // resolve to an experimental Web Storage API that emits a warning on access.
      if (typeof window === "undefined") {
        throw new Error("Web storage is not available");
      }
      const storage = type === "session" ? sessionStorage : localStorage;
      storage.setItem("test", "test");
      storage.removeItem("test");
      this.interface = storage;
    } catch (_err) {
      this.interface = new MemoryStorage();
    }

    // Session storage is used as a fallback when writes to the primary
    // interface fail at runtime, so that values at least survive the current
    // browsing session.
    if (type === "local") {
      try {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("test", "test");
          sessionStorage.removeItem("test");
          this.fallbackInterface = sessionStorage;
        }
      } catch (_err) {
        // Ignore errors
      }
    }
  }

  /**
   * Set a value in storage. For efficiency, this method will remove the
   * value if it is undefined.
   *
   * @param key The key to set under.
   * @param value The value to set
   */
  public set<T>(key: string, value: T) {
    try {
      if (value === undefined) {
        this.remove(key);
      } else {
        this.interface.setItem(key, JSON.stringify(value));
        // Drop any fallback copy so that reads of this key stay consistent.
        this.fallbackInterface?.removeItem(key);
      }
    } catch (_err) {
      // The primary interface can fail at runtime, e.g. when its quota has
      // been exceeded — write to session storage instead so the value at
      // least survives the browsing session.
      try {
        this.fallbackInterface?.setItem(key, JSON.stringify(value));
      } catch (_err) {
        // Ignore errors
      }
    }
  }

  /**
   * Get a value from storage.
   *
   * @param key The key to get.
   * @param fallback The fallback value if the key doesn't exist.
   * @returns The value or undefined if it doesn't exist.
   */
  public get(key: string, fallback?: Primitive) {
    try {
      // A fallback copy only exists when the last successful write of this
      // key went there, so when present it is the most recent value.
      const value =
        this.fallbackInterface?.getItem(key) ?? this.interface.getItem(key);
      if (typeof value === "string") {
        return JSON.parse(value);
      }
    } catch (_err) {
      // Ignore errors
    }

    return fallback;
  }

  /**
   * Remove a value from storage.
   *
   * @param key The key to remove.
   */
  public remove(key: string) {
    try {
      this.interface.removeItem(key);
      this.fallbackInterface?.removeItem(key);
    } catch (_err) {
      // Ignore errors
    }
  }

  /**
   * Clear all values from storage.
   */
  public clear() {
    try {
      this.interface.clear();
      this.fallbackInterface?.clear();
    } catch (_err) {
      // Ignore errors
    }
  }
}

/**
 * MemoryStorage is a simple in-memory storage implementation that is used
 * when localStorage is not available.
 */
class MemoryStorage {
  private data: Record<string, string> = {};

  getItem(key: string) {
    return this.data[key] || null;
  }

  setItem(key: string, value: Primitive) {
    return (this.data[key] = String(value));
  }

  removeItem(key: string) {
    return delete this.data[key];
  }

  clear() {
    return (this.data = {});
  }
}

export default new Storage();
