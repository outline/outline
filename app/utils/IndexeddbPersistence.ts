import * as Y from "yjs";

/**
 * Number of stored updates after which they are merged into a single database
 * row containing the entire document state, keeping loads fast.
 */
export const PREFERRED_TRIM_SIZE = 500;

/**
 * Persists a Y.Doc to IndexedDB so documents can be loaded instantly from the
 * local cache and edited offline.
 *
 * Adapted from y-indexeddb (https://github.com/yjs/y-indexeddb, MIT licensed)
 * so that we have full control over the underlying database rows. The schema
 * is kept compatible with databases created by y-indexeddb: one database per
 * document containing an "updates" object store where each row is a binary
 * Yjs update keyed by an auto-incrementing integer. Rows are periodically
 * compacted into a single row holding the whole document state.
 */
export class IndexeddbPersistence {
  /** Name of the IndexedDB database that backs this instance. */
  public readonly name: string;

  /** The Y.Doc that is being persisted. */
  public readonly doc: Y.Doc;

  /** Whether the state stored in the database has been applied to the document. */
  public synced = false;

  /**
   * Resolves once the state stored in the database has been applied to the
   * document, or immediately if the instance is destroyed beforehand – check
   * `synced` to distinguish the two.
   */
  public readonly whenSynced: Promise<IndexeddbPersistence>;

  /**
   * @param name Name of the database, unique per persisted document.
   * @param doc The Y.Doc to persist.
   */
  constructor(name: string, doc: Y.Doc) {
    this.name = name;
    this.doc = doc;
    this.dbPromise = openDatabase(name);

    this.whenSynced = this.dbPromise.then(async (db) => {
      this.db = db;
      await this.fetchStoredUpdates(true);

      if (!this.destroyed) {
        this.synced = true;
      }
      return this;
    });

    doc.on("update", this.handleDocUpdate);
    doc.on("destroy", this.destroy);
  }

  /**
   * Merges all stored update rows into a single row containing the current
   * document state.
   *
   * @returns a promise that resolves when compaction has completed.
   */
  public compact(): Promise<void> {
    return this.storeState(true);
  }

  /**
   * Stops persisting the document and closes the database connection. Data
   * already stored is left intact.
   *
   * @returns a promise that resolves when the database has been closed.
   */
  public destroy = (): Promise<void> => {
    if (this.destroyed) {
      return Promise.resolve();
    }
    this.destroyed = true;

    if (this.storeTimeoutId !== undefined) {
      clearTimeout(this.storeTimeoutId);
      this.storeTimeoutId = undefined;
    }

    this.doc.off("update", this.handleDocUpdate);
    this.doc.off("destroy", this.destroy);

    return this.dbPromise.then(
      (db) => db.close(),
      () => undefined
    );
  };

  private dbPromise: Promise<IDBDatabase>;

  private db: IDBDatabase | null = null;

  /** Key of the first update row that has not been applied to the document. */
  private dbref = 0;

  /** Approximate number of rows in the updates store. */
  private dbsize = 0;

  private destroyed = false;

  /** Time in ms to debounce compaction once the trim size is reached. */
  private storeTimeout = 1000;

  private storeTimeoutId?: ReturnType<typeof setTimeout>;

  /**
   * Appends every local document update as a new row, and schedules a
   * compaction once the number of rows grows beyond PREFERRED_TRIM_SIZE.
   */
  private handleDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (!this.db || origin === this || this.destroyed) {
      return;
    }

    this.updatesStore(this.db).add(update);

    if (++this.dbsize >= PREFERRED_TRIM_SIZE) {
      if (this.storeTimeoutId !== undefined) {
        clearTimeout(this.storeTimeoutId);
      }
      this.storeTimeoutId = setTimeout(() => {
        this.storeTimeoutId = undefined;
        void this.storeState(false);
      }, this.storeTimeout);
    }
  };

  /**
   * Applies all rows stored since the last read to the document – on first
   * call this loads the document, on later calls it picks up rows written by
   * other tabs. When `storeCurrentState` is set, any state already in the
   * document is written as a new row so it cannot be lost.
   *
   * @returns the object store, still inside the read-write transaction.
   */
  private async fetchStoredUpdates(
    storeCurrentState = false
  ): Promise<IDBObjectStore | undefined> {
    if (!this.db) {
      return undefined;
    }
    const store = this.updatesStore(this.db);
    const updates: Uint8Array[] = await requestToPromise(
      store.getAll(IDBKeyRange.lowerBound(this.dbref, false))
    );

    if (!this.destroyed) {
      if (storeCurrentState && this.doc.store.clients.size > 0) {
        store.add(Y.encodeStateAsUpdate(this.doc));
      }
      Y.transact(
        this.doc,
        () => updates.forEach((update) => Y.applyUpdate(this.doc, update)),
        this,
        false
      );
    }

    const lastKeyPromise = getLastKey(store);
    const countPromise = requestToPromise(store.count());
    this.dbref = (await lastKeyPromise) + 1;
    this.dbsize = await countPromise;
    return store;
  }

  /**
   * Writes the whole document state as a single row and deletes the rows it
   * replaces. Unless `force` is set, this only happens once the number of
   * rows has grown beyond PREFERRED_TRIM_SIZE.
   */
  private async storeState(force: boolean): Promise<void> {
    const store = await this.fetchStoredUpdates();

    if (!store || this.destroyed) {
      return;
    }
    if (force || this.dbsize >= PREFERRED_TRIM_SIZE) {
      store.add(Y.encodeStateAsUpdate(this.doc));
      store.delete(IDBKeyRange.upperBound(this.dbref, true));
      this.dbsize = await requestToPromise(store.count());
    }
  }

  private updatesStore(db: IDBDatabase): IDBObjectStore {
    return db
      .transaction(updatesStoreName, "readwrite")
      .objectStore(updatesStoreName);
  }
}

const updatesStoreName = "updates";

// Unused, but created so the schema stays identical to databases created by
// y-indexeddb, which older clients may still expect.
const customStoreName = "custom";

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openDatabase(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(updatesStoreName)) {
        db.createObjectStore(updatesStoreName, { autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(customStoreName)) {
        db.createObjectStore(customStoreName);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getLastKey(store: IDBObjectStore): Promise<number> {
  return new Promise((resolve, reject) => {
    const request = store.openKeyCursor(null, "prev");
    request.onsuccess = () =>
      resolve(request.result ? Number(request.result.key) : -1);
    request.onerror = () => reject(request.error);
  });
}
