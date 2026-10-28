import { randomUUID } from "node:crypto";
import type { ProsemirrorData } from "@shared/types";
import { createContext } from "@server/context";
import { Document, Event, Revision } from "@server/models";
import Redis from "@server/storage/redis";
import { buildDocument, buildUser } from "@server/test/factories";
import { AuthenticationType } from "@server/types";
import DocumentUpdateTextTask from "../tasks/DocumentUpdateTextTask";
import RevisionsProcessor from "./RevisionsProcessor";

const ip = "127.0.0.1";

const paragraph = (
  text: string,
  marks?: ProsemirrorData["marks"]
): ProsemirrorData => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text, marks }] }],
});

describe("documents.update.debounced", () => {
  it("should create a revision", async () => {
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

  it("should not create a revision if identical to previous", async () => {
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

  it("should not create a revision if only comment marks changed", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      content: paragraph("Hello world"),
    });
    await Revision.createFromDocument(createContext({ user }), document);

    document.content = paragraph("Hello world", [
      { type: "comment", attrs: { id: randomUUID(), userId: user.id } },
    ]);
    await document.save();

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
    expect(await Revision.count({ where: { documentId: document.id } })).toBe(
      1
    );
  });

  it("should create a revision if text changed alongside comment marks", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      content: paragraph("Hello world"),
    });
    await Revision.createFromDocument(createContext({ user }), document);

    document.content = paragraph("Hello there world", [
      { type: "comment", attrs: { id: randomUUID(), userId: user.id } },
    ]);
    await document.save();

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
    expect(await Revision.count({ where: { documentId: document.id } })).toBe(
      2
    );
  });

  it("should consume attribution up to the cutoff when identical to previous", async () => {
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

describe("documents.update", () => {
  it("should update the text of a new document", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
    });
    const schedule = vi.spyOn(DocumentUpdateTextTask.prototype, "schedule");
    schedule.mockClear();

    const processor = new RevisionsProcessor();
    await processor.perform({
      name: "documents.update",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: document.createdById,
      createdAt: new Date().toISOString(),
      data: { done: false },
      ip,
    });

    expect(schedule).toHaveBeenCalledTimes(1);
    expect(await Revision.count({ where: { documentId: document.id } })).toBe(
      0
    );
  });

  it("should not update the text of an older document", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      teamId: user.teamId,
      userId: user.id,
      createdAt: new Date("2020-01-01"),
      updatedAt: new Date("2020-01-01"),
      publishedAt: new Date("2020-01-01"),
    });
    const schedule = vi.spyOn(DocumentUpdateTextTask.prototype, "schedule");
    schedule.mockClear();

    const processor = new RevisionsProcessor();
    await processor.perform({
      name: "documents.update",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: document.createdById,
      createdAt: new Date().toISOString(),
      data: { done: false },
      ip,
    });

    expect(schedule).not.toHaveBeenCalled();
  });
});
