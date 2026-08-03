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

  it("should remap links between documents in different trees", async () => {
    const user = await buildUser();
    const original = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const second = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: original.id,
      title: "second",
    });
    const first = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: original.id,
      title: "first",
      text: [
        `Relative [second](${second.path}).`,
        `Qualified [second](https://wiki.example.com${second.path}).`,
      ].join("\n\n"),
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
    const duplicatedFirst = documents.find(
      (d) => d.sourceMetadata?.originalDocumentId === first.id
    );
    const duplicatedSecond = documents.find(
      (d) => d.sourceMetadata?.originalDocumentId === second.id
    );

    expect(duplicatedFirst?.text).toContain(`(${duplicatedSecond?.path})`);
    expect(duplicatedFirst?.text).toContain(
      `(https://wiki.example.com${duplicatedSecond?.path})`
    );
    expect(duplicatedFirst?.text).not.toContain(second.urlId);
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
