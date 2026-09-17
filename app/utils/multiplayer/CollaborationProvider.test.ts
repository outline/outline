import * as Y from "yjs";
import {
  CollaborationProvider,
  type SyncStateEvent,
} from "./CollaborationProvider";

describe("CollaborationProvider", () => {
  let doc: Y.Doc;
  let provider: CollaborationProvider;
  let events: SyncStateEvent[];

  const edit = (origin?: unknown) => {
    doc.transact(() => doc.getText("default").insert(0, "a"), origin);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    doc = new Y.Doc();
    events = [];
    provider = new CollaborationProvider({
      url: "ws://localhost",
      name: "test",
      document: doc,
      connect: false,
    });
    provider.on("syncStateChange", (event: SyncStateEvent) => {
      events.push(event);
    });
  });

  afterEach(() => {
    provider.destroy();
    vi.useRealTimers();
  });

  it("starts without pending changes", () => {
    expect(provider.hasPendingChanges).toBe(false);
    expect(provider.hasLocalPersistence).toBe(false);
  });

  it("reports an edit made while disconnected immediately", () => {
    edit();

    expect(provider.hasPendingChanges).toBe(true);
    expect(events).toEqual([
      { hasUnsyncedChanges: true, hasLocalPersistence: false },
    ]);
  });

  it("ignores updates that came from the provider itself", () => {
    edit(provider);

    expect(provider.hasPendingChanges).toBe(false);
    expect(events).toEqual([]);
  });

  it("waits for the grace period while connected", () => {
    provider.synced = true;
    edit();

    expect(provider.hasPendingChanges).toBe(false);

    vi.advanceTimersByTime(2000);

    expect(provider.hasPendingChanges).toBe(true);
    expect(events).toHaveLength(1);
  });

  it("clears pending changes once the server confirms a full sync", () => {
    edit();
    expect(provider.hasPendingChanges).toBe(true);

    provider.unsyncedChanges = 0;
    provider.synced = true;

    expect(provider.hasPendingChanges).toBe(false);
    expect(events.at(-1)).toEqual({
      hasUnsyncedChanges: false,
      hasLocalPersistence: false,
    });
  });

  it("keeps pending changes across a reconnect", () => {
    edit();
    provider.synced = true;
    vi.advanceTimersByTime(2000);
    expect(provider.hasPendingChanges).toBe(true);

    provider.synced = false;

    expect(provider.hasPendingChanges).toBe(true);
    expect(events).toHaveLength(1);
  });

  it("includes the local persistence state", () => {
    provider.setLocalPersistence(true);
    edit();

    expect(events.at(-1)).toEqual({
      hasUnsyncedChanges: true,
      hasLocalPersistence: true,
    });
  });

  it("does not report after being destroyed", () => {
    provider.synced = true;
    edit();
    provider.destroy();

    vi.advanceTimersByTime(2000);

    expect(provider.hasPendingChanges).toBe(false);
  });
});
