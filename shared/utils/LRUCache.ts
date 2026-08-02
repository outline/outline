import { Storage } from "./Storage";

/** Options accepted when constructing an `LRUCache`. */
export interface LRUCacheOptions {
  /** The maximum number of entries to retain before evicting. */
  max: number;
  /** Prefix under which entries are stored, used to namespace and version them. */
  namespace?: string;
  /** Mirror entries to sessionStorage, requires a namespace. */
  persistToSession?: boolean;
}

/**
 * A cache holding a bounded number of entries, evicting the least recently used
 * once full. Reading or writing an entry marks it as the most recently used.
 *
 * Entries are optionally mirrored to sessionStorage so that they survive a
 * reload, in which case values must be JSON-serializable. Persisted values are
 * read back only when they are first accessed, so the cache holds no more in
 * memory than the session has used. Storage failures are ignored, leaving the
 * cache to operate in memory alone.
 */
export class LRUCache<T> {
  public constructor(options: LRUCacheOptions) {
    this.max = options.max;
    this.namespace = options.namespace;
    this.persistToSession = options.persistToSession;
  }

  /**
   * Returns the value stored under a key, marking it as most recently used.
   *
   * @param key the key to look up.
   * @returns the cached value, or undefined if it is not cached.
   */
  public get(key: string): T | undefined {
    this.hydrate();

    // `has` distinguishes a missing key from one that is persisted but has not
    // been read into memory yet.
    const value = this.data.has(key)
      ? (this.data.get(key) ?? this.load(key))
      : undefined;
    if (value === undefined) {
      return undefined;
    }

    // Re-insert so that the entry becomes the most recently used.
    this.data.delete(key);
    this.data.set(key, value);
    this.writeKeys();
    return value;
  }

  /**
   * Stores a value under a key, evicting the least recently used entries when
   * the cache is over its maximum size.
   *
   * @param key the key to store under.
   * @param value the value to store.
   */
  public set(key: string, value: T) {
    this.hydrate();

    this.data.delete(key);
    this.data.set(key, value);
    this.writeValue(key, value);

    // Map iteration follows insertion order, so the first key is the least
    // recently used.
    while (this.data.size > this.max) {
      const oldest = this.data.keys().next().value;
      if (oldest === undefined) {
        break;
      }
      this.data.delete(oldest);
      this.removeValue(oldest);
    }

    this.writeKeys();
  }

  /**
   * Returns whether a key is cached, without affecting its recency.
   *
   * @param key the key to look up.
   * @returns true if the key is cached.
   */
  public has(key: string): boolean {
    this.hydrate();
    return this.data.has(key);
  }

  /**
   * Removes the entry stored under a key.
   *
   * @param key the key to remove.
   * @returns true if an entry was removed.
   */
  public delete(key: string): boolean {
    this.hydrate();

    if (!this.data.delete(key)) {
      return false;
    }

    this.removeValue(key);
    this.writeKeys();
    return true;
  }

  /** Removes every entry from the cache, including any persisted copies. */
  public clear() {
    this.hydrate();

    for (const key of this.data.keys()) {
      this.removeValue(key);
    }
    this.data.clear();
    this.writeKeys();
  }

  /** The number of entries currently cached. */
  public get size(): number {
    this.hydrate();
    return this.data.size;
  }

  private max: number;
  private namespace?: string;
  private persistToSession?: boolean;
  // An entry is undefined while it is persisted but not yet read into memory.
  private data = new Map<string, T | undefined>();
  private storage?: Storage;
  private hydrated = false;

  /** The storage key holding the cached keys in least-to-most recent order. */
  private get keysKey(): string {
    return `${this.namespace}:keys`;
  }

  private valueKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  /**
   * Loads persisted entries into memory, deferred until first use so that
   * constructing a cache at module scope does not read from storage on import.
   */
  private hydrate() {
    if (this.hydrated) {
      return;
    }
    this.hydrated = true;

    if (!this.persistToSession || !this.namespace) {
      return;
    }

    this.storage = new Storage("session");

    // A corrupt or absent index reads as undefined, leaving the cache empty.
    const keys: unknown = this.storage.get(this.keysKey);
    if (!Array.isArray(keys)) {
      return;
    }

    for (const key of keys.slice(-this.max)) {
      if (typeof key === "string") {
        this.data.set(key, undefined);
      }
    }
  }

  /**
   * Reads a persisted value into memory, dropping the key if its value is no
   * longer stored, which happens when an earlier write exceeded the quota.
   */
  private load(key: string): T | undefined {
    const value: T | undefined = this.storage?.get(this.valueKey(key));
    if (value === undefined) {
      this.data.delete(key);
      this.writeKeys();
      return undefined;
    }

    this.data.set(key, value);
    return value;
  }

  private writeValue(key: string, value: T) {
    this.storage?.set(this.valueKey(key), value);
  }

  private removeValue(key: string) {
    this.storage?.remove(this.valueKey(key));
  }

  private writeKeys() {
    this.storage?.set(this.keysKey, [...this.data.keys()]);
  }
}
