import { debounce } from "es-toolkit/compat";
import type Model from "~/models/base/Model";
import type { PartialExcept } from "~/types";
import Logger from "~/utils/Logger";
import type Store from "./Store";

/** Bump to discard previously persisted data when the format changes. */
const SCHEMA_VERSION = 1;

/** Name of the single object store used within each database. */
const OBJECT_STORE_NAME = "items";

/** How long to wait after the last change before writing to IndexedDB. */
const FLUSH_DELAY_MS = 1000;

interface PersistedRecord<T extends Model> {
  id: string;
  data: PartialExcept<T, "id">;
}

/**
 * Persists a store's models to IndexedDB so that previously loaded data
 * survives a reload and is available offline. Persisted data is strictly a
 * cache – it is hydrated into the store at boot as stale data and revalidated
 * by normal API traffic, which always wins over the cached copy.
 */
export default class StorePersistence<T extends Model> {
  /** Whether IndexedDB persistence is supported in the current environment. */
  public static get isSupported(): boolean {
    return typeof window !== "undefined" && !!window.indexedDB;
  }

  /**
   * Builds the name of the database backing a store, scoped to a team so that
   * cached data is never shared between accounts on the same origin.
   *
   * @param storeName the name of the store, eg "policies".
   * @param teamId the ID of the team the data belongs to.
   * @returns the database name.
   */
  public static databaseName(storeName: string, teamId: string): string {
    return `outline.${storeName}.${teamId}`;
  }

  constructor(store: Store<T>, teamId: string) {
    this.store = store;
    this.name = StorePersistence.databaseName(store.apiEndpoint, teamId);
  }

  /**
   * Loads all persisted records into the store. Records for models already in
   * the store are skipped, as in-memory data is always fresher than the cache.
   *
   * @returns a promise that resolves when hydration is complete.
   */
  public hydrate = async (): Promise<void> => {
    try {
      const database = await this.open();
      const records = await promisifyRequest<PersistedRecord<T>[]>(
        database
          .transaction(OBJECT_STORE_NAME, "readonly")
          .objectStore(OBJECT_STORE_NAME)
          .getAll()
      );

      for (const record of records) {
        if (!this.store.get(record.id)) {
          this.store.add(record.data);
        }
      }
    } catch (err) {
      this.disabled = true;
      Logger.warn("Failed to hydrate store from IndexedDB", {
        database: this.name,
        error: err,
      });
    }
  };

  /**
   * Schedules the model with the given ID to be written to IndexedDB. If the
   * model is no longer in the store when the write occurs, the persisted
   * record is deleted instead.
   *
   * @param id the ID of the model to persist.
   */
  public persist = (id: string) => {
    if (this.disabled) {
      return;
    }
    this.dirty.add(id);
    this.scheduleFlush();
  };

  /**
   * Writes all pending changes to IndexedDB immediately.
   *
   * @returns a promise that resolves when the write is complete.
   */
  public flush = async (): Promise<void> => {
    if (this.disabled || this.dirty.size === 0) {
      return;
    }

    const ids = Array.from(this.dirty);
    this.dirty.clear();

    try {
      const database = await this.open();
      const transaction = database.transaction(OBJECT_STORE_NAME, "readwrite");
      const objectStore = transaction.objectStore(OBJECT_STORE_NAME);

      for (const id of ids) {
        const model = this.store.get(id);
        if (model) {
          objectStore.put({ id, data: serialize(model) });
        } else {
          objectStore.delete(id);
        }
      }

      await promisifyTransaction(transaction);
    } catch (err) {
      Logger.warn("Failed to write store to IndexedDB", {
        database: this.name,
        error: err,
      });
    }
  };

  /**
   * Removes all persisted records, used when the store is cleared on logout.
   *
   * @returns a promise that resolves when the records have been removed.
   */
  public clear = async (): Promise<void> => {
    this.dirty.clear();

    if (this.disabled) {
      return;
    }

    try {
      const database = await this.open();
      await promisifyRequest(
        database
          .transaction(OBJECT_STORE_NAME, "readwrite")
          .objectStore(OBJECT_STORE_NAME)
          .clear()
      );
    } catch (err) {
      Logger.warn("Failed to clear persisted store in IndexedDB", {
        database: this.name,
        error: err,
      });
    }
  };

  private open = (): Promise<IDBDatabase> => {
    if (!this.database) {
      this.database = new Promise((resolve, reject) => {
        const request = window.indexedDB.open(this.name, SCHEMA_VERSION);

        request.onupgradeneeded = () => {
          const database = request.result;
          if (database.objectStoreNames.contains(OBJECT_STORE_NAME)) {
            database.deleteObjectStore(OBJECT_STORE_NAME);
          }
          database.createObjectStore(OBJECT_STORE_NAME, { keyPath: "id" });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return this.database;
  };

  private scheduleFlush = debounce(() => void this.flush(), FLUSH_DELAY_MS);

  private store: Store<T>;

  private name: string;

  private database?: Promise<IDBDatabase>;

  private dirty = new Set<string>();

  private disabled = false;
}

/**
 * Serializes a model to a plain object safe for structured cloning, dropping
 * functions and other non-serializable properties.
 *
 * @param model the model to serialize.
 * @returns a plain object representation of the model.
 */
function serialize<T extends Model>(model: T): PartialExcept<T, "id"> {
  return JSON.parse(JSON.stringify(model));
}

/**
 * Converts an IndexedDB request into a promise.
 *
 * @param request the request to convert.
 * @returns a promise that resolves with the request result.
 */
function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Converts an IndexedDB transaction into a promise.
 *
 * @param transaction the transaction to convert.
 * @returns a promise that resolves when the transaction completes.
 */
function promisifyTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
