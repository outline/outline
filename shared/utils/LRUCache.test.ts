import { LRUCache } from "./LRUCache";

describe("LRUCache", () => {
  it("stores and retrieves values", () => {
    const cache = new LRUCache<number>({ max: 3 });
    cache.set("a", 1);

    expect(cache.get("a")).toBe(1);
    expect(cache.get("missing")).toBeUndefined();
    expect(cache.size).toBe(1);
  });

  it("evicts the least recently used entry when over max", () => {
    const cache = new LRUCache<number>({ max: 2 });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);

    expect(cache.size).toBe(2);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
  });

  it("marks an entry as recently used when read", () => {
    const cache = new LRUCache<number>({ max: 2 });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.get("a");
    cache.set("c", 3);

    expect(cache.get("a")).toBe(1);
    expect(cache.get("b")).toBeUndefined();
  });

  it("overwrites without growing", () => {
    const cache = new LRUCache<number>({ max: 2 });
    cache.set("a", 1);
    cache.set("a", 2);

    expect(cache.size).toBe(1);
    expect(cache.get("a")).toBe(2);
  });

  it("deletes and clears entries", () => {
    const cache = new LRUCache<number>({ max: 3 });
    cache.set("a", 1);
    cache.set("b", 2);

    expect(cache.delete("a")).toBe(true);
    expect(cache.delete("a")).toBe(false);
    expect(cache.has("a")).toBe(false);
    expect(cache.has("b")).toBe(true);

    cache.clear();
    expect(cache.size).toBe(0);
  });

  // Shared tests run in both node and jsdom; web storage only exists in jsdom.
  const hasStorage = typeof window !== "undefined";

  describe.runIf(!hasStorage)("without web storage", () => {
    it("falls back to an in-memory cache", () => {
      const cache = new LRUCache<string>({
        max: 1,
        namespace: "test",
        persistToSession: true,
      });
      cache.set("a", "one");
      cache.set("b", "two");

      expect(cache.get("a")).toBeUndefined();
      expect(cache.get("b")).toBe("two");
    });
  });

  describe.runIf(hasStorage)("with persistence", () => {
    beforeEach(() => {
      sessionStorage.clear();
    });

    it("restores entries from storage", () => {
      const cache = new LRUCache<string>({
        max: 3,
        namespace: "test",
        persistToSession: true,
      });
      cache.set("a", "one");
      cache.set("b", "two");

      const restored = new LRUCache<string>({
        max: 3,
        namespace: "test",
        persistToSession: true,
      });
      expect(restored.get("a")).toBe("one");
      expect(restored.get("b")).toBe("two");
    });

    it("reads persisted values only when they are accessed", () => {
      const cache = new LRUCache<string>({
        max: 3,
        namespace: "test",
        persistToSession: true,
      });
      cache.set("a", "one");
      cache.set("b", "two");

      const restored = new LRUCache<string>({
        max: 3,
        namespace: "test",
        persistToSession: true,
      });
      // Hydrating reads the index alone, so a value replaced afterwards is
      // still the one returned on first access.
      expect(restored.size).toBe(2);
      sessionStorage.setItem("test:a", JSON.stringify("updated"));
      expect(restored.get("a")).toBe("updated");

      // Once in memory the value is not read from storage again.
      sessionStorage.setItem("test:a", JSON.stringify("ignored"));
      expect(restored.get("a")).toBe("updated");
    });

    it("drops an indexed key whose value is missing", () => {
      const cache = new LRUCache<string>({
        max: 3,
        namespace: "test",
        persistToSession: true,
      });
      cache.set("a", "one");
      sessionStorage.removeItem("test:a");

      const restored = new LRUCache<string>({
        max: 3,
        namespace: "test",
        persistToSession: true,
      });
      expect(restored.get("a")).toBeUndefined();
      expect(restored.size).toBe(0);
    });

    it("does not restore entries from another namespace", () => {
      const cache = new LRUCache<string>({
        max: 3,
        namespace: "test",
        persistToSession: true,
      });
      cache.set("a", "one");

      const other = new LRUCache<string>({
        max: 3,
        namespace: "other",
        persistToSession: true,
      });
      expect(other.get("a")).toBeUndefined();
    });

    it("removes evicted entries from storage", () => {
      const cache = new LRUCache<string>({
        max: 1,
        namespace: "test",
        persistToSession: true,
      });
      cache.set("a", "one");
      cache.set("b", "two");

      expect(sessionStorage.getItem("test:a")).toBeNull();

      const restored = new LRUCache<string>({
        max: 1,
        namespace: "test",
        persistToSession: true,
      });
      expect(restored.get("a")).toBeUndefined();
      expect(restored.get("b")).toBe("two");
    });

    it("removes persisted entries on clear", () => {
      const cache = new LRUCache<string>({
        max: 3,
        namespace: "test",
        persistToSession: true,
      });
      cache.set("a", "one");
      cache.clear();

      const restored = new LRUCache<string>({
        max: 3,
        namespace: "test",
        persistToSession: true,
      });
      expect(restored.size).toBe(0);
    });

    it("starts empty when the persisted index is corrupt", () => {
      sessionStorage.setItem("test:keys", "not json");

      const cache = new LRUCache<string>({
        max: 3,
        namespace: "test",
        persistToSession: true,
      });
      expect(cache.size).toBe(0);

      cache.set("a", "one");
      expect(cache.get("a")).toBe("one");
    });
  });
});
