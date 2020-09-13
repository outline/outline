/* eslint-disable flowtype/require-valid-file-annotation */
import Backlink from "../models/Backlink";
import { buildDocument } from "../test/factories";
import { flushdb } from "../test/support";
import BacklinksService from "./backlinks";

const Backlinks = new BacklinksService();

beforeEach(() => flushdb());
beforeEach(jest.resetAllMocks);

describe("documents.update", () => {
  test("should not fail on a document with no previous revisions", async () => {
    const otherDocument = await buildDocument();
    const document = await buildDocument({
      text: `[this is a link](${otherDocument.url})`,
    });

    await Backlinks.on({
      name: "documents.update",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
      data: { autosave: false },
    });

    const backlinks = await Backlink.findAll({
      where: { reverseDocumentId: document.id },
    });

    expect(backlinks.length).toBe(1);
  });

  test("should not fail when previous revision is different document version", async () => {
    const otherDocument = await buildDocument();
    const document = await buildDocument({
      version: null,
      text: `[ ] checklist item`,
    });

    document.text = `[this is a link](${otherDocument.url})`;
    await document.save();

    await Backlinks.on({
      name: "documents.update",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
      data: { autosave: false },
    });

    const backlinks = await Backlink.findAll({
      where: { reverseDocumentId: document.id },
    });

    expect(backlinks.length).toBe(1);
  });

  test("should create new backlink records", async () => {
    const otherDocument = await buildDocument();
    const document = await buildDocument();

    document.text = `[this is a link](${otherDocument.url})`;
    await document.save();

    await Backlinks.on({
      name: "documents.update",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
      data: { autosave: false },
    });

    const backlinks = await Backlink.findAll({
      where: { reverseDocumentId: document.id },
    });

    expect(backlinks.length).toBe(1);
  });

  test("should destroy removed backlink records", async () => {
    const otherDocument = await buildDocument();
    const document = await buildDocument({
      text: `[this is a link](${otherDocument.url})`,
    });

    await Backlinks.on({
      name: "documents.publish",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
      data: { autosave: false },
    });

    document.text = "Link is gone";
    await document.save();

    await Backlinks.on({
      name: "documents.update",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
      data: { autosave: false },
    });

    const backlinks = await Backlink.findAll({
      where: { reverseDocumentId: document.id },
    });

    expect(backlinks.length).toBe(0);
  });

  test("should update titles in backlinked documents", async () => {
    const newTitle = "test";
    const document = await buildDocument();
    const otherDocument = await buildDocument();

    // create a doc with a link back
    document.text = `[${otherDocument.title}](${otherDocument.url})`;
    await document.save();

    // ensure the backlinks are created
    await Backlinks.on({
      name: "documents.update",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
      data: { autosave: false },
    });

    // change the title of the linked doc
    otherDocument.title = newTitle;
    await otherDocument.save();

    // does the text get updated with the new title
    await Backlinks.on({
      name: "documents.update",
      documentId: otherDocument.id,
      collectionId: otherDocument.collectionId,
      teamId: otherDocument.teamId,
      actorId: otherDocument.createdById,
      data: { autosave: false },
    });
    await document.reload();

    expect(document.text).toBe(`[${newTitle}](${otherDocument.url})`);
  });
});
