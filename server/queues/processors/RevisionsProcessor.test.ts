import { createContext } from "@server/context";
import { Document, Event, Revision } from "@server/models";
import Redis from "@server/storage/redis";
import { buildDocument, buildUser } from "@server/test/factories";
import { AuthenticationType } from "@server/types";
import RevisionsProcessor from "./RevisionsProcessor";

const ip = "127.0.0.1";

describe("documents.update.debounced", () => {
  test("should create a revision", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
    });

    const processor = new RevisionsProcessor();
    await processor.perform({
      name: "documents.update.debounced",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: document.createdById,
      createdAt: new Date().toISOString(),
      data: { done: true },
      authType: AuthenticationType.APP,
      ip,
    });
    const revision = await Revision.findOne({
      where: {
        documentId: document.id,
      },
      rejectOnEmpty: true,
    });
    const event = await Event.findLatest({ teamId: document.teamId });

    expect(revision.documentId).toBe(document.id);
    expect(revision.userId).toBe(document.createdById);
    expect(revision.createdAt).toEqual(document.updatedAt);
    expect(revision.sourceMetadata?.authType).toBe(AuthenticationType.APP);
    expect(event?.name).toBe("revisions.create");
    expect(event?.modelId).toBe(revision.id);
    expect(event?.authType).toBe(AuthenticationType.APP);
  });

  test("should not create a revision if identical to previous", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
    });
    await Revision.createFromDocument(createContext({ user }), document);
    const collaborator = await buildUser({ teamId: user.teamId });
    const key = Document.getCollaboratorKey(document.id);
    await Redis.defaultClient.zadd(key, 1, collaborator.id);

    const processor = new RevisionsProcessor();
    await processor.perform({
      name: "documents.update.debounced",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: document.createdById,
      createdAt: new Date().toISOString(),
      data: { done: true },
      ip,
    });
    const amount = await Revision.count({
      where: {
        documentId: document.id,
      },
    });
    expect(amount).toBe(1);
    expect(await Redis.defaultClient.zrange(key, 0, -1)).toEqual([
      collaborator.id,
    ]);
  });

  test("should consume attribution up to the cutoff when identical to previous", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
    });
    await Revision.createFromDocument(createContext({ user }), document);
    const included = await buildUser({ teamId: user.teamId });
    const later = await buildUser({ teamId: user.teamId });
    const key = Document.getCollaboratorKey(document.id);
    await Redis.defaultClient.zadd(key, 1, included.id);
    await Redis.defaultClient.zadd(key, 2, later.id);

    const processor = new RevisionsProcessor();
    await processor.perform({
      name: "documents.update",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: document.createdById,
      createdAt: new Date().toISOString(),
      data: { done: true, collaborators: 1 },
      ip,
    });
    const amount = await Revision.count({
      where: {
        documentId: document.id,
      },
    });
    expect(amount).toBe(1);
    expect(await Redis.defaultClient.zrange(key, 0, -1)).toEqual([later.id]);
  });
});
