/* oxlint-disable */
import "fake-indexeddb/auto";
// The stores singleton must be imported before RootStore so that the module
// cycle through AuthStore -> developer.ts -> ~/stores resolves in the same
// order as the application entry point.
import "~/stores";
import { toJS } from "mobx";
import RootStore from "~/stores/RootStore";
import StorePersistence from "./StorePersistence";

describe("StorePersistence", () => {
  it("round-trips models through IndexedDB into a fresh store", async () => {
    const teamId = "team-1";
    const source = new RootStore();
    const persistence = new StorePersistence(source.policies, teamId);

    source.policies.add({
      id: "doc-1",
      abilities: { read: true, update: ["membership-1"] },
    });
    persistence.persist("doc-1");
    await persistence.flush();

    const target = new RootStore();
    const targetPersistence = new StorePersistence(target.policies, teamId);
    await targetPersistence.hydrate();

    expect(toJS(target.policies.get("doc-1")?.abilities)).toEqual({
      read: true,
      update: ["membership-1"],
    });
    expect(target.policies.abilities("doc-1").read).toBe(true);
    expect(target.policies.abilities("doc-1").update).toBeTruthy();
  });

  it("stores the model flat, without internal state or a duplicated id", async () => {
    const teamId = "team-6";
    const source = new RootStore();
    const persistence = new StorePersistence(source.policies, teamId);

    source.policies.add({ id: "doc-1", abilities: { read: true } });
    persistence.persist("doc-1");
    await persistence.flush();

    const records = await readAll(
      StorePersistence.databaseName(source.policies.apiEndpoint, teamId)
    );

    expect(records).toEqual([{ id: "doc-1", abilities: { read: true } }]);
  });

  it("ignores unknown properties on records written by another version", async () => {
    const teamId = "team-7";
    const source = new RootStore();
    const persistence = new StorePersistence(source.policies, teamId);
    const databaseName = StorePersistence.databaseName(
      source.policies.apiEndpoint,
      teamId
    );

    // A record in the shape an earlier version of this code wrote.
    await writeAll(databaseName, [
      {
        id: "doc-1",
        data: { id: "doc-1", initialized: true, abilities: { read: true } },
      },
    ]);
    await persistence.hydrate();

    expect(source.policies.get("doc-1")).toBeTruthy();
    expect("data" in source.policies.get("doc-1")!).toBe(false);

    // The stale shape must not be written back out on the next flush.
    source.policies.add({ id: "doc-1", abilities: { read: false } });
    persistence.persist("doc-1");
    await persistence.flush();

    expect(await readAll(databaseName)).toEqual([
      { id: "doc-1", abilities: { read: false } },
    ]);
  });

  it("does not overwrite models already in the store when hydrating", async () => {
    const teamId = "team-2";
    const source = new RootStore();
    const persistence = new StorePersistence(source.policies, teamId);

    source.policies.add({ id: "doc-1", abilities: { read: false } });
    persistence.persist("doc-1");
    await persistence.flush();

    const target = new RootStore();
    target.policies.add({ id: "doc-1", abilities: { read: true } });
    const targetPersistence = new StorePersistence(target.policies, teamId);
    await targetPersistence.hydrate();

    expect(target.policies.get("doc-1")?.abilities).toEqual({ read: true });
  });

  it("deletes the persisted record when the model has been removed", async () => {
    const teamId = "team-3";
    const source = new RootStore();
    const persistence = new StorePersistence(source.policies, teamId);

    source.policies.add({ id: "doc-1", abilities: { read: true } });
    persistence.persist("doc-1");
    await persistence.flush();

    source.policies.remove("doc-1");
    persistence.persist("doc-1");
    await persistence.flush();

    const target = new RootStore();
    const targetPersistence = new StorePersistence(target.policies, teamId);
    await targetPersistence.hydrate();

    expect(target.policies.get("doc-1")).toBeUndefined();
  });

  it("does not write back records that were just hydrated", async () => {
    const teamId = "team-5";
    const source = new RootStore();
    const persistence = new StorePersistence(source.policies, teamId);

    source.policies.add({ id: "doc-1", abilities: { read: true } });
    persistence.persist("doc-1");
    await persistence.flush();

    const target = new RootStore();
    await target.policies.enablePersistence(teamId);

    // Drop the model without notifying persistence, so that any flush scheduled
    // during hydration would delete the persisted record when it fires.
    target.policies.data.delete("doc-1");
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const other = new RootStore();
    const otherPersistence = new StorePersistence(other.policies, teamId);
    await otherPersistence.hydrate();

    expect(other.policies.get("doc-1")).toBeTruthy();
  });

  it("reopens the database after the connection is closed underneath it", async () => {
    const teamId = "team-8";
    const source = new RootStore();
    const persistence = new StorePersistence(source.policies, teamId);
    const opened: IDBDatabase[] = [];
    const open = indexedDB.open.bind(indexedDB);
    vi.spyOn(indexedDB, "open").mockImplementation((...args) => {
      const request = open(...args);
      request.addEventListener("success", () => opened.push(request.result));
      return request;
    });

    source.policies.add({ id: "doc-1", abilities: { read: true } });
    persistence.persist("doc-1");
    await persistence.flush();

    // Closing the connection directly leaves a stale one cached, as the browser
    // does when it reclaims storage – no close event is fired.
    opened.forEach((database) => database.close());

    source.policies.add({ id: "doc-2", abilities: { read: true } });
    persistence.persist("doc-2");
    await persistence.flush();

    expect(
      await readAll(
        StorePersistence.databaseName(source.policies.apiEndpoint, teamId)
      )
    ).toHaveLength(2);
    vi.restoreAllMocks();
  });

  it("does not recreate the database from a pending flush once disabled", async () => {
    const teamId = "team-10";
    const source = new RootStore();
    const persistence = new StorePersistence(source.policies, teamId);
    const databaseName = StorePersistence.databaseName(
      source.policies.apiEndpoint,
      teamId
    );

    source.policies.add({ id: "doc-1", abilities: { read: true } });
    persistence.persist("doc-1");

    // Disabling while a debounced write is still scheduled, as logout does.
    persistence.disable();
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const databases = await indexedDB.databases();
    expect(databases.map((database) => database.name)).not.toContain(
      databaseName
    );
  });

  it("does not block another tab from deleting the database", async () => {
    const teamId = "team-9";
    const source = new RootStore();
    const persistence = new StorePersistence(source.policies, teamId);
    const databaseName = StorePersistence.databaseName(
      source.policies.apiEndpoint,
      teamId
    );

    source.policies.add({ id: "doc-1", abilities: { read: true } });
    persistence.persist("doc-1");
    await persistence.flush();

    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(databaseName);
      request.onsuccess = () => resolve(undefined);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("Deletion was blocked"));
    });

    source.policies.add({ id: "doc-2", abilities: { read: true } });
    persistence.persist("doc-2");
    await persistence.flush();

    expect(await readAll(databaseName)).toEqual([
      { id: "doc-2", abilities: { read: true } },
    ]);
  });

  it("clear removes all persisted records", async () => {
    const teamId = "team-4";
    const source = new RootStore();
    const persistence = new StorePersistence(source.policies, teamId);

    source.policies.add({ id: "doc-1", abilities: { read: true } });
    source.policies.add({ id: "doc-2", abilities: { read: true } });
    persistence.persist("doc-1");
    persistence.persist("doc-2");
    await persistence.flush();

    await persistence.clear();

    const target = new RootStore();
    const targetPersistence = new StorePersistence(target.policies, teamId);
    await targetPersistence.hydrate();

    expect(target.policies.orderedData).toHaveLength(0);
  });

  it("clear leaves no database behind for a closed connection to fail against", async () => {
    const teamId = "team-11";
    const source = new RootStore();
    const persistence = new StorePersistence(source.policies, teamId);
    const databaseName = StorePersistence.databaseName(
      source.policies.apiEndpoint,
      teamId
    );

    source.policies.add({ id: "doc-1", abilities: { read: true } });
    persistence.persist("doc-1");
    await persistence.flush();

    await persistence.clear();

    const databases = await indexedDB.databases();
    expect(databases.map((database) => database.name)).not.toContain(
      databaseName
    );
  });
});

/** Writes raw records into a database, bypassing the store. */
function writeAll(databaseName: string, records: unknown[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("items", { keyPath: "id" });
    request.onsuccess = () => {
      const transaction = request.result.transaction("items", "readwrite");
      const objectStore = transaction.objectStore("items");
      records.forEach((record) => objectStore.put(record));
      transaction.oncomplete = () => {
        request.result.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

/** Reads the raw persisted records from a database, bypassing the store. */
function readAll(databaseName: string): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const getAll = request.result
        .transaction("items", "readonly")
        .objectStore("items")
        .getAll();
      getAll.onerror = () => reject(getAll.error);
      getAll.onsuccess = () => resolve(getAll.result);
    };
  });
}
