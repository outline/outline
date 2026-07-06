import "fake-indexeddb/auto";
import * as Y from "yjs";
import { IndexeddbPersistence } from "./IndexeddbPersistence";

const updatesStoreName = "updates";

function countRows(name: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(name);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const request = db
        .transaction(updatesStoreName, "readonly")
        .objectStore(updatesStoreName)
        .count();
      request.onsuccess = () => {
        db.close();
        resolve(request.result);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    };
  });
}

async function load(name: string) {
  const doc = new Y.Doc();
  const persistence = new IndexeddbPersistence(name, doc);
  await persistence.whenSynced;
  return { doc, persistence };
}

describe("IndexeddbPersistence", () => {
  it("stores one row per update and loads them into a new document", async () => {
    const name = "document.test-load";
    const { doc, persistence } = await load(name);
    expect(persistence.synced).toBe(true);

    doc.getText("default").insert(0, "hello");
    doc.getText("default").insert(5, " world");
    await persistence.destroy();

    expect(await countRows(name)).toBe(2);

    const second = await load(name);
    expect(second.doc.getText("default").toJSON()).toBe("hello world");

    // loading an empty doc must not add rows
    expect(await countRows(name)).toBe(2);
    await second.persistence.destroy();
  });

  it("persists state already present in the document before load", async () => {
    const name = "document.test-preexisting";
    const doc = new Y.Doc();
    doc.getText("default").insert(0, "preexisting");

    const persistence = new IndexeddbPersistence(name, doc);
    await persistence.whenSynced;
    await persistence.destroy();

    const second = await load(name);
    expect(second.doc.getText("default").toJSON()).toBe("preexisting");
    await second.persistence.destroy();
  });

  it("compacts all rows into a single row without losing state", async () => {
    const name = "document.test-compact";
    const { doc, persistence } = await load(name);

    doc.getText("default").insert(0, "a");
    doc.getText("default").insert(1, "b");
    doc.getText("default").insert(2, "c");
    await persistence.compact();

    expect(await countRows(name)).toBe(1);
    await persistence.destroy();

    const second = await load(name);
    expect(second.doc.getText("default").toJSON()).toBe("abc");
    await second.persistence.destroy();
  });

  it("stops persisting after destroy", async () => {
    const name = "document.test-destroy";
    const { doc, persistence } = await load(name);

    doc.getText("default").insert(0, "kept");
    await persistence.destroy();
    doc.getText("default").insert(4, " dropped");

    const second = await load(name);
    expect(second.doc.getText("default").toJSON()).toBe("kept");
    await second.persistence.destroy();
  });

  it("applies updates written by another connection when compacting", async () => {
    const name = "document.test-multi";
    const first = await load(name);
    const second = await load(name);

    first.doc.getText("default").insert(0, "from first");
    await second.persistence.compact();

    expect(second.doc.getText("default").toJSON()).toBe("from first");
    await first.persistence.destroy();
    await second.persistence.destroy();
  });
});
