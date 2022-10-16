import { Revision, Event } from "@server/models";
import { buildDocument } from "@server/test/factories";
import { setupTestDatabase } from "@server/test/support";
import script from "./20210716000000-backfill-revisions";

setupTestDatabase();

describe("#work", () => {
  it("should create events for revisions", async () => {
    const document = await buildDocument();
    const revision = await Revision.createFromDocument(document);
    await script();
    const event = await Event.findOne();
    expect(event!.name).toEqual("revisions.create");
    expect(event!.modelId).toEqual(revision.id);
    expect(event!.documentId).toEqual(document.id);
    expect(event!.teamId).toEqual(document.teamId);
    expect(event!.createdAt).toEqual(revision.createdAt);
  });

  it("should create events for revisions of deleted documents", async () => {
    const document = await buildDocument();
    const revision = await Revision.createFromDocument(document);
    await document.destroy();
    await script();
    const event = await Event.findOne();
    expect(event!.name).toEqual("revisions.create");
    expect(event!.modelId).toEqual(revision.id);
    expect(event!.documentId).toEqual(document.id);
    expect(event!.teamId).toEqual(document.teamId);
    expect(event!.createdAt).toEqual(revision.createdAt);
  });

  it("should be idempotent", async () => {
    const document = await buildDocument();
    await Revision.createFromDocument(document);
    await script();
    await script();
    const count = await Event.count();
    expect(count).toEqual(1);
  });
});
