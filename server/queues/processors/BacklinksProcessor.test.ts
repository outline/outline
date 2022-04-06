import { Backlink } from "@server/models";
import { buildDocument } from "@server/test/factories";
import { flushdb } from "@server/test/support";
import BacklinksProcessor from "./BacklinksProcessor";

const ip = "127.0.0.1";

beforeEach(() => flushdb());
beforeEach(jest.resetAllMocks);

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

describe("documents.title_change", () => {
  test("should update titles in backlinked documents", async () => {
    const newTitle = "test";
    const document = await buildDocument();
    const otherDocument = await buildDocument();
    const previousTitle = otherDocument.title;
    // create a doc with a link back
    document.text = `[${otherDocument.title}](${otherDocument.url})`;
    await document.save();
    // ensure the backlinks are created
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
    // change the title of the linked doc
    otherDocument.title = newTitle;
    await otherDocument.save();
    // does the text get updated with the new title
    await processor.perform({
      name: "documents.title_change",
      documentId: otherDocument.id,
      collectionId: otherDocument.collectionId,
      teamId: otherDocument.teamId,
      actorId: otherDocument.createdById,
      createdAt: new Date().toISOString(),
      data: {
        previousTitle,
        title: newTitle,
      },
      ip,
    });
    await document.reload();
    expect(document.text).toBe(`[${newTitle}](${otherDocument.url})`);
  });
});
