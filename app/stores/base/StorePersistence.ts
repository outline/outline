import { debounce } from "es-toolkit/compat";
import type Model from "~/models/base/Model";
import Logger from "~/utils/Logger";
import type Store from "./Store";

/** Bump to discard previously persisted data when the format changes. */
const SCHEMA_VERSION = 1;

/** Name of the single object store used within each database. */
const OBJECT_STORE_NAME = "items";

/** How long to wait after the last change before writing to IndexedDB. */
const FLUSH_DELAY_MS = 1000;

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
      const records = await this.transaction("readonly", (objectStore) =>
        promisifyRequest<Record<string, unknown>[]>(objectStore.getAll())
      );

      this.hydrating = true;
      for (const record of records) {
        const id = record?.id;
        if (typeof id !== "string" || this.store.get(id)) {
          continue;
        }
        this.store.add(this.store.model.fromPersisted<T>(record));
      }
    } catch (err) {
      this.disabled = true;
      Logger.warn("Failed to hydrate store from IndexedDB", {
        database: this.name,
        error: err,
      });
    } finally {
      this.hydrating = false;
    }
  };

  /**
   * Schedules the model with the given ID to be written to IndexedDB. If the
   * model is no longer in the store when the write occurs, the persisted
   * record is deleted instead. A no-op while hydrating, as those records have
   * just been read from the cache.
   *
   * @param id the ID of the model to persist.
   */
  public persist = (id: string) => {
    if (this.disabled || this.hydrating) {
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
      await this.transaction("readwrite", (objectStore) => {
        for (const id of ids) {
          const model = this.store.get(id);
          if (model) {
            objectStore.put(model.toPersisted());
          } else {
            objectStore.delete(id);
          }
        }

        return promisifyTransaction(objectStore.transaction);
      });
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
      await this.transaction("readwrite", (objectStore) => {
        objectStore.clear();
        return promisifyTransaction(objectStore.transaction);
      });
    } catch (err) {
      Logger.warn("Failed to clear persisted store in IndexedDB", {
        database: this.name,
        error: err,
      });
    }
  };

  /**
   * Closes the connection to the database, if one is open. Safe to call at any
   * time; a later read or write opens a fresh connection.
   */
  public close = () => {
    this.connection?.close();
    this.forget();
  };

  /**
   * Runs an operation against the object store. The connection is opened once
   * and reused, but it may be closed at any time by the browser or by another
   * tab deleting the database, so a closed connection is reopened for a single
   * retry.
   *
   * @param mode the mode the transaction should run in.
   * @param run the operation to run against the object store.
   * @returns a promise that resolves with the result of the operation.
   */
  private transaction = async <R>(
    mode: IDBTransactionMode,
    run: (objectStore: IDBObjectStore) => Promise<R>
  ): Promise<R> => {
    try {
      return await run(await this.objectStore(mode));
    } catch (err) {
      if (!isConnectionClosedError(err)) {
        throw err;
      }
      this.close();
      return run(await this.objectStore(mode));
    }
  };

  private objectStore = async (
    mode: IDBTransactionMode
  ): Promise<IDBObjectStore> => {
    const database = await this.open();
    try {
      return database
        .transaction(OBJECT_STORE_NAME, mode)
        .objectStore(OBJECT_STORE_NAME);
    } catch (err) {
      this.forget();
      throw err;
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
        request.onsuccess = () => {
          const database = request.result;
          this.connection = database;

          // Another tab is deleting or upgrading the database – get out of the
          // way, rather than blocking it, and reopen when next needed.
          database.onversionchange = () => {
            database.close();
            this.forget(database);
          };
          database.onclose = () => this.forget(database);

          resolve(database);
        };
        request.onerror = () => {
          this.forget();
          reject(request.error);
        };
        request.onblocked = () => {
          this.forget();
          reject(new Error(`Opening ${this.name} was blocked`));
        };
      });
    }
    return this.database;
  };

  /**
   * Discards the cached connection so that the next operation opens a new one,
   * unless it has already been replaced.
   */
  private forget = (database?: IDBDatabase) => {
    if (database && this.connection !== database) {
      return;
    }
    this.connection = undefined;
    this.database = undefined;
  };

  private scheduleFlush = debounce(() => void this.flush(), FLUSH_DELAY_MS);

  private store: Store<T>;

  private name: string;

  private database?: Promise<IDBDatabase>;

  private connection?: IDBDatabase;

  private dirty = new Set<string>();

  private disabled = false;

  private hydrating = false;
}

/**
 * Whether an error was caused by the connection to the database closing, in
 * which case the operation did not run and can safely be retried.
 *
 * @param err the error to check.
 * @returns true if the connection was closed.
 */
function isConnectionClosedError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === "InvalidStateError" || err.name === "AbortError")
  );
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
    transaction.onabort = () =>
      reject(
        transaction.error ??
          new DOMException("The transaction was aborted", "AbortError")
      );
  });
}
