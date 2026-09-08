/* oxlint-disable */
import { runInAction } from "mobx";
import Storage from "@shared/utils/Storage";
// The store singleton must load first so that the module cycle through the
// developer utilities resolves before RootStore is used directly.
import "~/stores";
import RootStore from "~/stores/RootStore";
import { client } from "~/utils/ApiClient";

const KEY = "AUTH_STORE";
const USER_ID = "11111111-1111-1111-1111-111111111111";
const TEAM_ID = "22222222-2222-2222-2222-222222222222";

const signedIn = (updatedAt: number) => ({
  user: { id: USER_ID, name: "Test User" },
  team: { id: TEAM_ID, name: "Test Team" },
  collaborationToken: "token",
  availableTeams: [],
  policies: [],
  updatedAt,
});

const signedOut = (updatedAt: number) => ({
  collaborationToken: null,
  availableTeams: [],
  policies: [],
  updatedAt,
});

/**
 * Builds a store that behaves like a separate browser tab. Storage events are
 * captured rather than registered on the window so that each test can deliver
 * them to exactly the tabs it created.
 */
function createTab() {
  const handlers: EventListener[] = [];
  const spy = vi
    .spyOn(window, "addEventListener")
    .mockImplementation((type, handler) => {
      if (type === "storage" && typeof handler === "function") {
        handlers.push(handler);
      }
    });
  const stores = new RootStore();
  spy.mockRestore();

  return {
    auth: stores.auth,
    receive: (value: string) =>
      handlers.forEach((handler) =>
        handler(new StorageEvent("storage", { key: KEY, newValue: value }))
      ),
  };
}

describe("AuthStore", () => {
  let writes: string[];
  let now: number;

  beforeEach(() => {
    writes = [];
    now = 1000;
    Storage.remove(KEY);
    vi.spyOn(Date, "now").mockImplementation(() => now);
    vi.mocked(client.post).mockImplementation(() => new Promise(() => {}));

    const set = Storage.set.bind(Storage);
    vi.spyOn(Storage, "set").mockImplementation((key, value) => {
      set(key, value);
      if (key === KEY) {
        writes.push(JSON.stringify(value));
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("persistence", () => {
    it("does not persist a signed out state when no session was stored", () => {
      const tab = createTab();

      expect(tab.auth.authenticated).toBe(false);
      expect(writes).toEqual([]);
    });

    it("stamps writes so that each supersedes the last", () => {
      Storage.set(KEY, signedIn(1000));
      writes = [];
      const tab = createTab();

      runInAction(() => {
        tab.auth.collaborationToken = "changed";
      });

      expect(writes.map((write) => JSON.parse(write).updatedAt)).toEqual([
        1001, 1002,
      ]);
    });
  });

  describe("storage events", () => {
    it("signs out when another tab signs out", () => {
      Storage.set(KEY, signedIn(1000));
      const tab = createTab();
      expect(tab.auth.authenticated).toBe(true);

      tab.receive(JSON.stringify(signedOut(2000)));

      expect(tab.auth.authenticated).toBe(false);
    });

    it("signs in when another tab signs in", () => {
      const tab = createTab();
      expect(tab.auth.authenticated).toBe(false);

      tab.receive(JSON.stringify(signedIn(2000)));

      expect(tab.auth.authenticated).toBe(true);
      expect(tab.auth.user?.id).toBe(USER_ID);
    });

    it("ignores writes that are older than the state of this tab", () => {
      Storage.set(KEY, signedIn(1000));
      const tab = createTab();
      now = 3000;
      void tab.auth.logout({ revokeToken: false, clearCache: false });
      expect(tab.auth.authenticated).toBe(false);

      tab.receive(JSON.stringify(signedIn(2000)));

      expect(tab.auth.authenticated).toBe(false);
    });

    it("ignores writes without a timestamp", () => {
      const tab = createTab();
      const { updatedAt, ...data } = signedIn(0);

      tab.receive(JSON.stringify(data));

      expect(tab.auth.authenticated).toBe(false);
    });

    it("converges when writes from two tabs cross", () => {
      Storage.set(KEY, signedIn(1000));
      const a = createTab();
      const b = createTab();
      writes = [];

      // Tab A signs out at the same moment tab B writes its session, so each
      // receives a write that contradicts the state it just persisted.
      now = 2000;
      void a.auth.logout({ revokeToken: false, clearCache: false });
      now = 2001;
      runInAction(() => {
        b.auth.collaborationToken = "refreshed";
      });
      expect(writes).toHaveLength(2);

      let delivered = 0;
      while (writes.length && delivered < 20) {
        const value = writes.shift()!;
        delivered++;
        now++;
        a.receive(value);
        b.receive(value);
      }

      expect(delivered).toBeLessThan(6);
      expect(a.auth.authenticated).toBe(b.auth.authenticated);
    });
  });
});
