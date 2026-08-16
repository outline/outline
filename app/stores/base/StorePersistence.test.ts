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
});
