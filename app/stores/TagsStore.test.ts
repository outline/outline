import Tag from "~/models/Tag";
import stores from "~/stores";

describe("TagsStore", () => {
  beforeEach(() => {
    stores.tags.clear();
  });

  it("populates name cache when a tag is added", () => {
    stores.tags.add({ id: "1", name: "engineering", teamId: "t1" } as unknown as Tag);
    expect(stores.tags.getByName("engineering")).toBeDefined();
  });

  it("getByName is case-insensitive", () => {
    stores.tags.add({ id: "1", name: "engineering", teamId: "t1" } as unknown as Tag);
    expect(stores.tags.getByName("ENGINEERING")).toBeDefined();
    expect(stores.tags.getByName("Engineering")).toBeDefined();
  });

  it("getByName returns undefined for missing tags", () => {
    expect(stores.tags.getByName("nonexistent")).toBeUndefined();
  });

  it("orderedData is sorted alphabetically", () => {
    stores.tags.add({ id: "2", name: "zebra", teamId: "t1" } as unknown as Tag);
    stores.tags.add({ id: "1", name: "alpha", teamId: "t1" } as unknown as Tag);
    const names = stores.tags.orderedData.map((t) => t.name);
    expect(names).toEqual(["alpha", "zebra"]);
  });

  it("clear() empties both orderedData and the name cache", () => {
    stores.tags.add({ id: "1", name: "engineering", teamId: "t1" } as unknown as Tag);
    stores.tags.clear();
    expect(stores.tags.orderedData).toHaveLength(0);
    expect(stores.tags.getByName("engineering")).toBeUndefined();
  });

  it("adding the same tag twice updates in place and does not duplicate in name cache", () => {
    stores.tags.add({ id: "1", name: "engineering", teamId: "t1" } as unknown as Tag);
    stores.tags.add({ id: "1", name: "engineering", teamId: "t1" } as unknown as Tag);
    expect(stores.tags.orderedData).toHaveLength(1);
    expect(stores.tags.getByName("engineering")).toBeDefined();
  });
});
