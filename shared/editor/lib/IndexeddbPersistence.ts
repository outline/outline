// Based on https://github.com/yjs/y-indexeddb/commit/3a52367c486c9f2b166c2fc0f83fe1a7d196a0fc

import * as idb from "lib0/indexeddb";
import * as mutex from "lib0/mutex";
import { Observable } from "lib0/observable";
import * as Y from "yjs";

const metaStoreName = "metadata";
const updatesStoreName = "updates";

export const PREFERRED_TRIM_SIZE = 500;

export class IndexeddbPersistence extends Observable<string> {
  public db: IDBDatabase | null = null;

  public doc: Y.Doc;

  public name: string;

  public synced = false;

  public whenSynced: Promise<void | this>;

  constructor(name: string, doc: Y.Doc) {
    super();
    this.doc = doc;
    this.name = name;
    this._db = idb.openDB(name, (db) =>
      idb.createStores(db, [["updates", { autoIncrement: true }], ["meta"]])
    );

    this.whenSynced = this._db.then(async (db) => {
      this.db = db;
      const currState = Y.encodeStateAsUpdate(doc);
      return this.fetchUpdates()
        .then((updatesStore) => idb.addAutoKey(updatesStore, currState))
        .then(() => {
          this.emit("synced", [this]);
          this.synced = true;
          return this;
        });
    });

    this._storeUpdate = (update: Uint8Array) =>
      this._mux(() => {
        if (this.db) {
          const [updatesStore] = idb.transact(this.db, [updatesStoreName]);
          idb.addAutoKey(updatesStore, update);
          if (++this._dbsize >= PREFERRED_TRIM_SIZE) {
            // debounce store call
            if (this._storeTimeoutId !== null) {
              clearTimeout(this._storeTimeoutId);
            }
            this._storeTimeoutId = setTimeout(() => {
              this.storeState(false);
              this._storeTimeoutId = null;
            }, this._storeTimeout);
          }
        }
      });

    doc.on("update", this._storeUpdate);
    doc.on("destroy", this.destroy);
  }

  private fetchUpdates = async () => {
    if (!this.db) {
      throw new Error("fetchUpdates called before db initialized");
    }

    const [updatesStore] = idb.transact(this.db, [updatesStoreName]);

    return idb
      .getAll(updatesStore, idb.createIDBKeyRangeLowerBound(this._dbref, false))
      .then((updates) =>
        this._mux(() =>
          Y.transact(
            this.doc,
            () => {
              updates.forEach((val) => Y.applyUpdate(this.doc, val));
            },
            this,
            false
          )
        )
      )
      .then(() =>
        idb.getLastKey(updatesStore).then((lastKey) => {
          this._dbref = lastKey + 1;
        })
      )
      .then(() =>
        idb.count(updatesStore).then((cnt) => {
          this._dbsize = cnt;
        })
      )
      .then(() => updatesStore);
  };

  private storeState = (forceStore = true) =>
    this.fetchUpdates().then((updatesStore) => {
      if (forceStore || this._dbsize >= PREFERRED_TRIM_SIZE) {
        idb
          .addAutoKey(updatesStore, Y.encodeStateAsUpdate(this.doc))
          .then(() =>
            idb.del(
              updatesStore,
              idb.createIDBKeyRangeUpperBound(this._dbref, true)
            )
          )
          .then(() =>
            idb.count(updatesStore).then((cnt) => {
              this._dbsize = cnt;
            })
          );
      }
    });

  destroy = async () => {
    if (this._storeTimeoutId) {
      clearTimeout(this._storeTimeoutId);
    }
    this.doc.off("update", this._storeUpdate);
    this.doc.off("destroy", this.destroy);
    return this._db.then((db) => {
      db.close();
    });
  };

  /**
   * Destroys this instance and removes all data from indexeddb.
   */
  clearData = async (): Promise<void> => {
    return this.destroy().then(() => {
      idb.deleteDB(this.name);
    });
  };

  get = async (
    key: string | number | ArrayBuffer | Date
  ): Promise<string | number | ArrayBuffer | Date | any> => {
    return this._db.then((db) => {
      const [meta] = idb.transact(db, [metaStoreName], "readonly");
      return idb.get(meta, key);
    });
  };

  set = async (
    key: string | number | ArrayBuffer | Date,
    value: string | number | ArrayBuffer | Date
  ): Promise<string | number | ArrayBuffer | Date> => {
    return this._db.then((db) => {
      const [meta] = idb.transact(db, [metaStoreName]);
      return idb.put(meta, value, key);
    });
  };

  del = async (
    key: string | number | ArrayBuffer | Date
  ): Promise<undefined> => {
    return this._db.then((db) => {
      const [meta] = idb.transact(db, [metaStoreName]);
      return idb.del(meta, key);
    });
  };

  /**
   * Timeout in ms until data is merged and persisted in idb.
   */
  private _storeTimeout = 1000;

  private _storeTimeoutId: NodeJS.Timeout | null = null;

  private _storeUpdate: (update: Uint8Array) => Promise<void>;

  private _mux = mutex.createMutex();
  private _dbsize = 0;
  private _dbref = 0;
  private _db: Promise<IDBDatabase>;
}
