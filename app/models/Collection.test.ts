/* oxlint-disable */
import stores from "~/stores";

describe("Collection model", () => {
  test("should initialize with data", () => {
    const collection = stores.collections.add({
      id: "123",
      name: "Engineering",
    });
    expect(collection.name).toBe("Engineering");
  });

  it("should show the translated name for a personal collection", () => {
    const collection = stores.collections.add({
      id: "456",
      name: "Renamed",
      ownerId: "user-id",
    });
    expect(collection.displayName).toBe("Personal");

    const shared = stores.collections.add({ id: "789", name: "Design" });
    expect(shared.displayName).toBe("Design");
  });
});
