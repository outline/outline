import { Primitive } from "utility-types";

/**
 * Storage is a wrapper class for localStorage that allow safe usage when
 * localStorage is not available.
 */
class Storage {
  interface: typeof localStorage | MemoryStorage;

  public constructor() {
    try {
      localStorage.setItem("test", "test");
      localStorage.removeItem("test");
      this.interface = localStorage;
    } catch (_err) {
      this.interface = new MemoryStorage();
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
      }
    } catch (_err) {
      // Ignore errors
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
      const value = this.interface.getItem(key);
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
