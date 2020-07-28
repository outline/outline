/* eslint-disable flowtype/require-valid-file-annotation */
import documentMover from "../commands/documentMover";
import { flushdb, seed } from "../test/support";
import { buildDocument, buildCollection } from "../test/factories";

beforeEach(flushdb);

describe("documentMover", async () => {
  const ip = "127.0.0.1";

  it("should move within a collection", async () => {
    const { document, user, collection } = await seed();

    const response = await documentMover({
      user,
      document,
      collectionId: collection.id,
      ip,
    });

    expect(response.collections.length).toEqual(1);
    expect(response.documents.length).toEqual(1);
  });

  it("should move with children", async () => {
    const { document, user, collection } = await seed();
    const newDocument = await buildDocument({
      parentDocumentId: document.id,
      collectionId: collection.id,
      teamId: collection.teamId,
      userId: collection.creatorId,
      title: "Child document",
      text: "content",
    });
    await collection.addDocumentToStructure(newDocument);

    const response = await documentMover({
      user,
      document,
      collectionId: collection.id,
      parentDocumentId: undefined,
      index: 0,
      ip,
    });

    expect(response.collections[0].documentStructure[0].children[0].id).toBe(
      newDocument.id
    );
    expect(response.collections.length).toEqual(1);
    expect(response.documents.length).toEqual(1);
  });

  it("should move with children to another collection", async () => {
    const { document, user, collection } = await seed();
    const newCollection = await buildCollection({
      teamId: collection.teamId,
    });
    const newDocument = await buildDocument({
      parentDocumentId: document.id,
      collectionId: collection.id,
      teamId: collection.teamId,
      userId: collection.creatorId,
      title: "Child document",
      text: "content",
    });
    await collection.addDocumentToStructure(newDocument);

    const response = await documentMover({
      user,
      document,
      collectionId: newCollection.id,
      parentDocumentId: undefined,
      index: 0,
      ip,
    });

    // check document ids where updated
    await newDocument.reload();
    expect(newDocument.collectionId).toBe(newCollection.id);

    await document.reload();
    expect(document.collectionId).toBe(newCollection.id);

    // check collection structure updated
    expect(response.collections[0].id).toBe(collection.id);
    expect(response.collections[1].id).toBe(newCollection.id);
    expect(response.collections[1].documentStructure[0].children[0].id).toBe(
      newDocument.id
    );
    expect(response.collections.length).toEqual(2);
    expect(response.documents.length).toEqual(2);
  });
});
