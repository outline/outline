import Tag from "~/models/Tag";
import stores from "~/stores";

describe("TagsStore", () => {
  beforeEach(() => {
    stores.tags.clear();
  });

  it("populates name cache when a tag is added", () => {
    stores.tags.add({ id: "1", name: "engineering", teamId: "t1" } as Partial<Tag> &
      Record<string, unknown>);
    expect(stores.tags.getByName("engineering")).toBeDefined();
  });

  it("getByName is case-insensitive", () => {
    stores.tags.add({ id: "1", name: "engineering", teamId: "t1" } as Partial<Tag> &
      Record<string, unknown>);
    expect(stores.tags.getByName("ENGINEERING")).toBeDefined();
    expect(stores.tags.getByName("Engineering")).toBeDefined();
  });

  it("getByName returns undefined for missing tags", () => {
    expect(stores.tags.getByName("nonexistent")).toBeUndefined();
  });

  it("orderedData is sorted alphabetically", () => {
    stores.tags.add({ id: "2", name: "zebra", teamId: "t1" } as Partial<Tag> &
      Record<string, unknown>);
    stores.tags.add({ id: "1", name: "alpha", teamId: "t1" } as Partial<Tag> &
      Record<string, unknown>);
    const names = stores.tags.orderedData.map((t) => t.name);
    expect(names).toEqual(["alpha", "zebra"]);
  });
});
