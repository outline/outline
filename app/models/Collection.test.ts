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

  it("should not add a document that is already in the collection", () => {
    const collection = stores.collections.add({
      id: "abc",
      name: "Personal",
      sort: { field: "title", direction: "asc" },
      documents: [],
    });
    const document = stores.documents.add({
      id: "doc-1",
      title: "Doc",
      url: "/doc/doc-1",
      collectionId: collection.id,
    });

    collection.addDocument(document);
    collection.addDocument(document);
    expect(collection.documents?.map((node) => node.id)).toEqual(["doc-1"]);
  });
});
