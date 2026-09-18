import "fake-indexeddb/auto";
import * as Y from "yjs";
import { IndexeddbPersistence } from "./IndexeddbPersistence";

vi.mock("~/utils/Logger");

describe("IndexeddbPersistence", () => {
  const name = `test.${Math.random()}`;

  it("loads updates stored by an earlier instance", async () => {
    const doc = new Y.Doc();
    const persistence = new IndexeddbPersistence(name, doc);
    await persistence.whenSynced;
    doc.getText("default").insert(0, "hello");
    await persistence.destroy();

    const reloaded = new Y.Doc();
    const again = new IndexeddbPersistence(name, reloaded);
    await again.whenSynced;

    expect(reloaded.getText("default").toJSON()).toBe("hello");
    await again.destroy();
  });

  it("stops when a write aborts the transaction", async () => {
    const doc = new Y.Doc();
    const persistence = new IndexeddbPersistence(name, doc);
    const onStop = vi.fn();
    persistence.onStop(onStop);
    await persistence.whenSynced;

    // oxlint-disable-next-line unbound-method
    const objectStore = IDBTransaction.prototype.objectStore;
    const spy = vi
      .spyOn(IDBTransaction.prototype, "objectStore")
      .mockImplementation(function (this: IDBTransaction, storeName: string) {
        const store = objectStore.call(this, storeName);
        this.abort();
        return store;
      });
    doc.getText("default").insert(0, "hello");
    await new Promise((resolve) => setTimeout(resolve, 0));
    spy.mockRestore();

    expect(persistence.stopped).toBe(true);
    expect(onStop).toHaveBeenCalledTimes(1);
    await persistence.destroy();
  });
});
