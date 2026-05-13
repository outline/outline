import Collection from "@server/models/Collection";
import Pin from "@server/models/Pin";
import {
  buildDocument,
  buildCollection,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import documentMover from "./documentMover";
import { withAPIContext } from "@server/test/support";

describe("documentMover", () => {
  it("should move within a collection", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: team.id,
    });
    const response = await withAPIContext(user, (ctx) =>
      documentMover(ctx, {
        document,
        collectionId: collection.id,
      })
    );
    expect(response.collections.length).toEqual(1);
    expect(response.documents.length).toEqual(1);
  });

  it("should succeed when not in source collection documentStructure", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: team.id,
    });
    const newDocument = await buildDocument({
      parentDocumentId: document.id,
      collectionId: collection.id,
      teamId: collection.teamId,
      userId: collection.createdById,
      title: "Child document",
      text: "content",
    });
    const response = await withAPIContext(user, (ctx) =>
      documentMover(ctx, {
        document,
        collectionId: collection.id,
        parentDocumentId: undefined,
        index: 0,
      })
    );
    expect(response.collections[0].documentStructure![0].children[0].id).toBe(
      newDocument.id
    );
    expect(response.collections.length).toEqual(1);
    expect(response.documents.length).toEqual(1);
    expect(response.documents[0].collection?.id).toEqual(collection.id);
    expect(response.documents[0].updatedBy.id).toEqual(user.id);
  });

  it("should move with children", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: team.id,
    });
    const newDocument = await buildDocument({
      parentDocumentId: document.id,
      collectionId: collection.id,
      teamId: collection.teamId,
      userId: collection.createdById,
      title: "Child document",
      text: "content",
    });
    await collection.addDocumentToStructure(newDocument);
    const response = await withAPIContext(user, (ctx) =>
      documentMover(ctx, {
        document,
        collectionId: collection.id,
        parentDocumentId: undefined,
        index: 0,
      })
    );
    expect(response.collections[0].documentStructure![0].children[0].id).toBe(
      newDocument.id
    );
    expect(response.collections.length).toEqual(1);
    expect(response.documents.length).toEqual(1);
    expect(response.documents[0].collection?.id).toEqual(collection.id);
    expect(response.documents[0].updatedBy.id).toEqual(user.id);
  });

  it("should move with children to another collection", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: team.id,
    });
    const newCollection = await buildCollection({
      teamId: collection.teamId,
    });
    const newDocument = await buildDocument({
      parentDocumentId: document.id,
      collectionId: collection.id,
      teamId: collection.teamId,
      userId: collection.createdById,
      title: "Child document",
      text: "content",
    });
    await collection.addDocumentToStructure(newDocument);
    const response = await withAPIContext(user, (ctx) =>
      documentMover(ctx, {
        document,
        collectionId: newCollection.id,
        parentDocumentId: undefined,
        index: 0,
      })
    );
    // check document ids where updated
    await newDocument.reload();
    expect(newDocument.collectionId).toBe(newCollection.id);

    // check collection structure updated
    expect(response.collections[0].id).toBe(collection.id);
    expect(response.collections[1].id).toBe(newCollection.id);
    expect(response.collections[1].documentStructure![0].children[0].id).toBe(
      newDocument.id
    );
    expect(response.collections.length).toEqual(2);
    expect(response.documents.length).toEqual(2);

    expect(response.documents[0].collection?.id).toEqual(newCollection.id);
    expect(response.documents[0].updatedBy.id).toEqual(user.id);
    expect(response.documents[1].collection?.id).toEqual(newCollection.id);
    expect(response.documents[1].updatedBy.id).toEqual(user.id);
  });

  it("should remove associated collection pin if moved to another collection", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: team.id,
    });
    const newCollection = await buildCollection({
      teamId: collection.teamId,
    });
    await Pin.create({
      createdById: user.id,
      collectionId: collection.id,
      documentId: document.id,
      teamId: collection.teamId,
    });

    const response = await withAPIContext(user, (ctx) =>
      documentMover(ctx, {
        document,
        collectionId: newCollection.id,
        parentDocumentId: undefined,
        index: 0,
      })
    );

    const pinCount = await Pin.count({
      where: {
        teamId: collection.teamId,
      },
    });
    expect(pinCount).toBe(0);

    // check collection structure updated
    expect(response.collections[0].id).toBe(collection.id);
    expect(response.collections[1].id).toBe(newCollection.id);
    expect(response.collections.length).toEqual(2);
    expect(response.documents.length).toEqual(1);

    expect(response.documents[0].collection?.id).toEqual(newCollection.id);
    expect(response.documents[0].updatedBy.id).toEqual(user.id);
  });

  it("should detach document from collection and move it to drafts", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: team.id,
    });

    const response = await withAPIContext(user, (ctx) =>
      documentMover(ctx, {
        document,
        collectionId: null,
        index: 0,
      })
    );

    expect(response.collections[0].id).toBe(collection.id);
    expect(response.collections.length).toEqual(1);
    expect(response.documents.length).toEqual(1);

    expect(response.documents[0].collection).toBeNull();
    expect(response.documents[0].updatedBy.id).toEqual(user.id);
    expect(response.documents[0].publishedAt).toBeNull();
  });

  it("bumps documentStructureVersion on a successful move", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const document = await buildDocument({
      userId: user.id,
      collectionId: collection.id,
      teamId: team.id,
    });

    const before = await Collection.findByPk(collection.id, {
      rejectOnEmpty: true,
    });
    const versionBefore = before.documentStructureVersion;

    await withAPIContext(user, (ctx) =>
      documentMover(ctx, {
        document,
        collectionId: collection.id,
        index: 0,
      })
    );

    const after = await Collection.findByPk(collection.id, {
      rejectOnEmpty: true,
    });
    expect(after.documentStructureVersion).toBeGreaterThan(versionBefore);
  });

  it("serialises concurrent moves on the same collection via retry", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const sourceA = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const sourceB = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const target = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const docA = await buildDocument({
      userId: user.id,
      collectionId: sourceA.id,
      teamId: team.id,
    });
    const docB = await buildDocument({
      userId: user.id,
      collectionId: sourceB.id,
      teamId: team.id,
    });

    // Two moves targeting the same destination collection run in independent
    // transactions. With optimistic concurrency one will conflict on the
    // version bump and retry; both should ultimately succeed.
    const [resultA, resultB] = await Promise.all([
      withAPIContext(user, (ctx) =>
        documentMover(ctx, {
          document: docA,
          collectionId: target.id,
          index: 0,
        })
      ),
      withAPIContext(user, (ctx) =>
        documentMover(ctx, {
          document: docB,
          collectionId: target.id,
          index: 0,
        })
      ),
    ]);

    expect(resultA.collectionChanged).toBe(true);
    expect(resultB.collectionChanged).toBe(true);

    const after = await Collection.findByPk(target.id, {
      includeDocumentStructure: true,
      rejectOnEmpty: true,
    });
    const ids = (after.documentStructure ?? []).map((node) => node.id);
    expect(ids).toContain(docA.id);
    expect(ids).toContain(docB.id);
  });
});
