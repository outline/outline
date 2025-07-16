import { createContext } from "@server/context";
import { Revision } from "@server/models";
import { buildDocument, buildUser } from "@server/test/factories";
import RevisionsProcessor from "./RevisionsProcessor";

const ip = "127.0.0.1";

describe("documents.update.debounced", () => {
  test("should create a revision", async () => {
    const document = await buildDocument();

    const processor = new RevisionsProcessor();
    await processor.perform({
      name: "documents.update.debounced",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: document.createdById,
      createdAt: new Date().toISOString(),
      data: { title: document.title, autosave: false, done: true },
      ip,
    });
    const amount = await Revision.count({
      where: {
        documentId: document.id,
      },
    });
    expect(amount).toBe(1);
  });

  test("should not create a revision if identical to previous", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
    });
    await Revision.createFromDocument(createContext({ user }), document);

    const processor = new RevisionsProcessor();
    await processor.perform({
      name: "documents.update.debounced",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: document.createdById,
      createdAt: new Date().toISOString(),
      data: { title: document.title, autosave: false, done: true },
      ip,
    });
    const amount = await Revision.count({
      where: {
        documentId: document.id,
      },
    });
    expect(amount).toBe(1);
  });
});
