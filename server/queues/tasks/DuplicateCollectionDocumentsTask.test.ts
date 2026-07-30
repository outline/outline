import { Document } from "@server/models";
import {
  buildCollection,
  buildDocument,
  buildDraftDocument,
  buildUser,
} from "@server/test/factories";
import DuplicateCollectionDocumentsTask from "./DuplicateCollectionDocumentsTask";

describe("DuplicateCollectionDocumentsTask", () => {
  it("should duplicate documents into the collection", async () => {
    const user = await buildUser();
    const original = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const parent = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: original.id,
    });
    await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: original.id,
      parentDocumentId: parent.id,
    });

    await new DuplicateCollectionDocumentsTask().perform({
      collectionId: collection.id,
      originalCollectionId: original.id,
      actorId: user.id,
      ip: null,
    });

    const documents = await Document.findAll({
      where: {
        collectionId: collection.id,
      },
    });
    expect(documents).toHaveLength(2);

    const duplicatedParent = documents.find((d) => !d.parentDocumentId);
    const duplicatedChild = documents.find((d) => !!d.parentDocumentId);
    expect(duplicatedParent?.title).toEqual(parent.title);
    expect(duplicatedParent?.publishedAt).toBeTruthy();
    expect(duplicatedChild?.parentDocumentId).toEqual(duplicatedParent?.id);
  });

  it("should not duplicate drafts", async () => {
    const user = await buildUser();
    const original = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: original.id,
    });
    await buildDraftDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: original.id,
    });

    await new DuplicateCollectionDocumentsTask().perform({
      collectionId: collection.id,
      originalCollectionId: original.id,
      actorId: user.id,
      ip: null,
    });

    const documents = await Document.findAll({
      where: {
        collectionId: collection.id,
      },
    });
    expect(documents).toHaveLength(1);
  });

  it("should do nothing when the collection has been deleted", async () => {
    const user = await buildUser();
    const original = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
      deletedAt: new Date(),
    });
    await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: original.id,
    });

    await new DuplicateCollectionDocumentsTask().perform({
      collectionId: collection.id,
      originalCollectionId: original.id,
      actorId: user.id,
      ip: null,
    });

    const documents = await Document.findAll({
      where: {
        collectionId: collection.id,
      },
    });
    expect(documents).toHaveLength(0);
  });
});
