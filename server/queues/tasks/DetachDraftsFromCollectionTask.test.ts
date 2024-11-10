import { Document } from "@server/models";
import { buildCollection, buildDocument } from "@server/test/factories";
import DetachDraftsFromCollectionTask from "./DetachDraftsFromCollectionTask";

describe("DetachDraftsFromCollectionTask", () => {
  const ip = "127.0.0.1";
  it("should detach drafts from deleted collection", async () => {
    const collection = await buildCollection();
    const document = await buildDocument({
      title: "test",
      collectionId: collection.id,
      publishedAt: null,
      createdById: collection.createdById,
      teamId: collection.teamId,
    });
    await collection.destroy({ hooks: false });

    const task = new DetachDraftsFromCollectionTask();
    await task.perform({
      collectionId: collection.id,
      ip,
      actorId: collection.createdById,
    });

    const draft = await Document.findByPk(document.id);
    expect(draft).not.toBe(null);
    expect(draft?.deletedAt).toBe(null);
    expect(draft?.collectionId).toBe(null);
  });

  it("should detach drafts from archived collection", async () => {
    const collection = await buildCollection({ archivedAt: new Date() });
    const document = await buildDocument({
      title: "test",
      collectionId: collection.id,
      publishedAt: null,
      createdById: collection.createdById,
      teamId: collection.teamId,
    });

    const task = new DetachDraftsFromCollectionTask();
    await task.perform({
      collectionId: collection.id,
      ip,
      actorId: collection.createdById,
    });

    const draft = await Document.findByPk(document.id);
    expect(draft).not.toBe(null);
    expect(draft?.archivedAt).toBe(null);
    expect(draft?.deletedAt).toBe(null);
    expect(draft?.collectionId).toBe(null);
  });
});
