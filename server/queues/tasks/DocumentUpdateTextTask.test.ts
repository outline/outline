import { Document } from "@server/models";
import { buildDocument } from "@server/test/factories";
import DocumentUpdateTextTask from "./DocumentUpdateTextTask";

describe("DocumentUpdateTextTask", () => {
  it("should update the text from the content", async () => {
    const document = await buildDocument({ text: "Original" });
    await Document.update(
      { text: "" },
      { where: { id: document.id }, hooks: false }
    );

    const task = new DocumentUpdateTextTask();
    await task.perform({
      name: "documents.update",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: document.createdById,
      createdAt: new Date().toISOString(),
      ip: "127.0.0.1",
    });

    const updated = await Document.unscoped().findByPk(document.id, {
      rejectOnEmpty: true,
    });
    expect(updated.text).toEqual("Original");
  });

  it("should not change the revision count", async () => {
    const document = await buildDocument({ text: "Original" });
    const { revisionCount, updatedAt } = await Document.unscoped().findByPk(
      document.id,
      { rejectOnEmpty: true }
    );

    const task = new DocumentUpdateTextTask();
    await task.perform({
      name: "documents.update",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: document.createdById,
      createdAt: new Date().toISOString(),
      ip: "127.0.0.1",
    });

    const updated = await Document.unscoped().findByPk(document.id, {
      rejectOnEmpty: true,
    });
    expect(updated.revisionCount).toEqual(revisionCount);
    expect(updated.updatedAt).toEqual(updatedAt);
  });
});
