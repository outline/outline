import { vi } from "vitest";
import fractionalIndex from "fractional-index";
import stores from "~/stores";

describe("sortAlphabetically", () => {
  beforeEach(() => {
    stores.collections.clear();
    stores.collections.add({ id: "z", name: "zoolanders", index: "a" });
    stores.collections.add({ id: "c", name: "Crimson Deserters", index: "b" });
    stores.collections.add({ id: "p", name: "Prod collection", index: "c" });
    vi.spyOn(stores.collections, "fetchAll").mockResolvedValue([]);
    vi.spyOn(stores.collections, "move").mockImplementation(
      async (id, index) => {
        stores.collections.get(id)?.updateIndex(index);
      }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    stores.collections.clear();
  });

  it("saves either alphabetical direction in the existing index order", async () => {
    await stores.collections.sortAlphabetically("asc");
    expect(stores.collections.allActive.map((c) => c.id)).toEqual([
      "c",
      "p",
      "z",
    ]);
    await stores.collections.sortAlphabetically("desc");
    expect(stores.collections.allActive.map((c) => c.id)).toEqual([
      "z",
      "p",
      "c",
    ]);
    expect(stores.collections.fetchAll).toHaveBeenCalledTimes(2);
  });

  it("does not move collections that are already in order", async () => {
    await stores.collections.sortAlphabetically("asc");
    vi.mocked(stores.collections.move).mockClear();
    await stores.collections.sortAlphabetically("asc");
    expect(stores.collections.move).not.toHaveBeenCalled();
  });

  it("includes collections fetched on demand and excludes archived collections", async () => {
    stores.collections.add({
      id: "archived",
      name: "AAA",
      index: "d",
      archivedAt: "2026-01-01T00:00:00.000Z",
    });
    vi.mocked(stores.collections.fetchAll).mockImplementation(async () => {
      stores.collections.add({ id: "a", name: "Alpha", index: "e" });
      return [];
    });
    await stores.collections.sortAlphabetically("asc");
    expect(stores.collections.allActive.map((c) => c.id)).toEqual([
      "a",
      "c",
      "p",
      "z",
    ]);
    expect(stores.collections.get("archived")?.index).toBe("d");
  });

  it("allows manual moves after sorting without reapplying alphabetical order", async () => {
    await stores.collections.sortAlphabetically("asc");
    await stores.collections.move(
      "z",
      fractionalIndex(null, stores.collections.allActive[0].index)
    );
    expect(stores.collections.allActive.map((c) => c.id)).toEqual([
      "z",
      "c",
      "p",
    ]);
    expect(stores.collections.isSorting).toBe(false);
  });

  it("stops on failure and clears the sorting flag", async () => {
    vi.mocked(stores.collections.move).mockRejectedValueOnce(
      new Error("Move failed")
    );
    await expect(stores.collections.sortAlphabetically("asc")).rejects.toThrow(
      "Move failed"
    );
    expect(stores.collections.move).toHaveBeenCalledTimes(1);
    expect(stores.collections.isSorting).toBe(false);
  });
});
