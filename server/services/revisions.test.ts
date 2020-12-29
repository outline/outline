/* eslint-disable flowtype/require-valid-file-annotation */
import { Revision } from "../models";
import { buildDocument } from "../test/factories";
import { flushdb } from "../test/support";
import RevisionsService from "./revisions";

const Revisions = new RevisionsService();

beforeEach(() => flushdb());
beforeEach(jest.resetAllMocks);

describe("documents.publish", () => {
  test("should create a revision", async () => {
    const document = await buildDocument();

    await Revisions.on({
      name: "documents.publish",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
    });

    const amount = await Revision.count({ where: { documentId: document.id } });
    expect(amount).toBe(1);
  });
});

describe("documents.update.debounced", () => {
  test("should create a revision", async () => {
    const document = await buildDocument();

    await Revisions.on({
      name: "documents.update.debounced",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
    });

    const amount = await Revision.count({ where: { documentId: document.id } });
    expect(amount).toBe(1);
  });

  test("should not create a revision if identical to previous", async () => {
    const document = await buildDocument();

    await Revision.createFromDocument(document);

    await Revisions.on({
      name: "documents.update.debounced",
      documentId: document.id,
      collectionId: document.collectionId,
      teamId: document.teamId,
      actorId: document.createdById,
    });

    const amount = await Revision.count({ where: { documentId: document.id } });
    expect(amount).toBe(1);
  });
});
