/**
 * Storage is a wrapper class for localStorage that allow safe usage when
 * localStorage is not available.
 */
export default class Storage {
  /**
   * Set a value in localStorage. For efficiency, this method will remove the
   * value if it is undefined.
   *
   * @param key The key to set under.
   * @param value The value to set
   */
  static set<T>(key: string, value: T) {
    try {
      if (value === undefined) {
        this.remove(key);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      // no-op Safari private mode
    }
  }

  /**
   * Get a value from localStorage.
   *
   * @param key The key to get.
   * @returns The value or undefined if it doesn't exist.
   */
  static get(key: string) {
    try {
      const value = localStorage.getItem(key);
      if (typeof value === "string") {
        return JSON.parse(value);
      }
    } catch (error) {
      // no-op Safari private mode
    }

    return undefined;
  }

  /**
   * Remove a value from localStorage.
   *
   * @param key The key to remove.
   */
  static remove(key: string) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      // no-op Safari private mode
    }
  }
}
