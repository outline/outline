import stores from "~/stores";
import UiStore from "./UiStore";

const directions: Array<"asc" | "desc"> = ["asc", "desc"];

describe("sidebarCollections", () => {
  beforeEach(() => {
    stores.collections.clear();
    stores.ui.set({ collectionSort: null });
    stores.collections.add({ id: "z", name: "zoolanders", index: "a" });
    stores.collections.add({ id: "c", name: "Crimson Deserters", index: "b" });
    stores.collections.add({ id: "p", name: "Prod collection", index: "c" });
  });

  afterEach(() => {
    stores.collections.clear();
    stores.ui.set({ collectionSort: null });
  });

  it("sorts both directions and restores saved positions in manual mode", () => {
    stores.ui.set({ collectionSort: "asc" });
    expect(stores.collections.sidebarCollections.map((c) => c.id)).toEqual([
      "c",
      "p",
      "z",
    ]);
    stores.ui.set({ collectionSort: "desc" });
    expect(stores.collections.sidebarCollections.map((c) => c.id)).toEqual([
      "z",
      "p",
      "c",
    ]);
    stores.ui.set({ collectionSort: null });
    expect(stores.collections.sidebarCollections.map((c) => c.id)).toEqual([
      "z",
      "c",
      "p",
    ]);
  });

  it.each(directions)(
    "keeps new and renamed collections in %s order",
    (direction) => {
      stores.ui.set({ collectionSort: direction });
      stores.collections.add({ id: "a", name: "Alpha", index: "d" });
      const expected = ["a", "c", "p", "z"];
      expect(stores.collections.sidebarCollections.map((c) => c.id)).toEqual(
        direction === "asc" ? expected : [...expected].reverse()
      );
      stores.collections.get("z")?.updateData({ name: "Beta" });
      const renamed = ["a", "z", "c", "p"];
      expect(stores.collections.sidebarCollections.map((c) => c.id)).toEqual(
        direction === "asc" ? renamed : [...renamed].reverse()
      );
      expect(stores.collections.allActive.map((c) => c.id)).toEqual([
        "z",
        "c",
        "p",
        "a",
      ]);
    }
  );

  it("excludes archived collections", () => {
    stores.collections.add({
      id: "archived",
      name: "AAA",
      index: "d",
      archivedAt: "2026-01-01T00:00:00.000Z",
    });
    stores.ui.set({ collectionSort: "asc" });
    expect(stores.collections.sidebarCollections.map((c) => c.id)).toEqual([
      "c",
      "p",
      "z",
    ]);
  });

  it("restores the selected mode after rehydrating preferences", () => {
    stores.ui.set({ collectionSort: "desc" });
    expect(new UiStore(stores).collectionSort).toBe("desc");
    stores.ui.set({ collectionSort: null });
    expect(new UiStore(stores).collectionSort).toBeNull();
  });
});
