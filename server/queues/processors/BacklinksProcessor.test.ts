import { Backlink } from "@server/models";
import { buildDocument } from "@server/test/factories";
import { setupTestDatabase } from "@server/test/support";
import BacklinksProcessor from "./BacklinksProcessor";

const ip = "127.0.0.1";

setupTestDatabase();

describe("documents.publish", () => {
  test("should create new backlink records", async () => {
    const otherDocument = await buildDocument();
    const document = await buildDocument({
      text: `[this is a link](${otherDocument.url})`,
    });

    const processor = new BacklinksProcessor();
    await processor.perform({
      name: "documents.publish",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
      data: { title: document.title },
      ip,
    });
    const backlinks = await Backlink.findAll({
      where: {
        reverseDocumentId: document.id,
      },
    });
    expect(backlinks.length).toBe(1);
  });

  test("should not fail when linked document is destroyed", async () => {
    const otherDocument = await buildDocument();
    await otherDocument.destroy();
    const document = await buildDocument({
      version: 0,
      text: `[ ] checklist item`,
    });
    document.text = `[this is a link](${otherDocument.url})`;
    await document.save();

    const processor = new BacklinksProcessor();
    await processor.perform({
      name: "documents.publish",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
      data: { title: document.title },
      ip,
    });
    const backlinks = await Backlink.findAll({
      where: {
        reverseDocumentId: document.id,
      },
    });
    expect(backlinks.length).toBe(0);
  });
});

describe("documents.update", () => {
  test("should not fail on a document with no previous revisions", async () => {
    const otherDocument = await buildDocument();
    const document = await buildDocument({
      text: `[this is a link](${otherDocument.url})`,
    });

    const processor = new BacklinksProcessor();
    await processor.perform({
      name: "documents.update",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
      createdAt: new Date().toISOString(),
      data: { title: document.title, autosave: false, done: true },
      ip,
    });
    const backlinks = await Backlink.findAll({
      where: {
        reverseDocumentId: document.id,
      },
    });
    expect(backlinks.length).toBe(1);
  });

  test("should not fail when previous revision is different document version", async () => {
    const otherDocument = await buildDocument();
    const document = await buildDocument({
      version: undefined,
      text: `[ ] checklist item`,
    });
    document.text = `[this is a link](${otherDocument.url})`;
    await document.save();

    const processor = new BacklinksProcessor();
    await processor.perform({
      name: "documents.update",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
      createdAt: new Date().toISOString(),
      data: { title: document.title, autosave: false, done: true },
      ip,
    });
    const backlinks = await Backlink.findAll({
      where: {
        reverseDocumentId: document.id,
      },
    });
    expect(backlinks.length).toBe(1);
  });

  test("should create new backlink records", async () => {
    const otherDocument = await buildDocument();
    const document = await buildDocument();
    document.text = `[this is a link](${otherDocument.url})`;
    await document.save();

    const processor = new BacklinksProcessor();
    await processor.perform({
      name: "documents.update",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
      createdAt: new Date().toISOString(),
      data: { title: document.title, autosave: false, done: true },
      ip,
    });
    const backlinks = await Backlink.findAll({
      where: {
        reverseDocumentId: document.id,
      },
    });
    expect(backlinks.length).toBe(1);
  });

  test("should destroy removed backlink records", async () => {
    const otherDocument = await buildDocument();
    const yetAnotherDocument = await buildDocument();
    const document = await buildDocument({
      text: `[this is a link](${otherDocument.url})

[this is a another link](${yetAnotherDocument.url})`,
    });

    const processor = new BacklinksProcessor();
    await processor.perform({
      name: "documents.publish",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
      data: { title: document.title },
      ip,
    });
    document.text = `First link is gone

[this is a another link](${yetAnotherDocument.url})`;
    await document.save();

    await processor.perform({
      name: "documents.update",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
      createdAt: new Date().toISOString(),
      data: { title: document.title, autosave: false, done: true },
      ip,
    });
    const backlinks = await Backlink.findAll({
      where: {
        reverseDocumentId: document.id,
      },
    });
    expect(backlinks.length).toBe(1);
    expect(backlinks[0].documentId).toBe(yetAnotherDocument.id);
  });
});

describe("documents.delete", () => {
  test("should destroy related backlinks", async () => {
    const otherDocument = await buildDocument();
    const document = await buildDocument();
    document.text = `[this is a link](${otherDocument.url})`;
    await document.save();

    const processor = new BacklinksProcessor();
    await processor.perform({
      name: "documents.update",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
      createdAt: new Date().toISOString(),
      data: { title: document.title, autosave: false, done: true },
      ip,
    });

    await processor.perform({
      name: "documents.delete",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
      data: { title: document.title },
      ip,
    });
    const backlinks = await Backlink.findAll({
      where: {
        reverseDocumentId: document.id,
      },
    });
    expect(backlinks.length).toBe(0);
  });
});
