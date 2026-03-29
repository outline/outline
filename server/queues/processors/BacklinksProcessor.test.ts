import { parser } from "@server/editor";
import { Relationship } from "@server/models";
import { RelationshipType } from "@server/models/Relationship";
import { buildDocument, buildTeam } from "@server/test/factories";

import BacklinksProcessor from "./BacklinksProcessor";

const ip = "127.0.0.1";

describe("documents.publish", () => {
  it("should create new backlink records", async () => {
    const team = await buildTeam();
    const otherDocument = await buildDocument({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      text: `[this is a link](${otherDocument.url})`,
    });

    const processor = new BacklinksProcessor();
    await processor.perform({
      name: "documents.publish",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: document.createdById,
      ip,
    });
    const backlinks = await Relationship.findAll({
      where: {
        reverseDocumentId: document.id,
        type: RelationshipType.Backlink,
      },
    });
    expect(backlinks.length).toBe(1);
  });

  it("should not fail when linked document is destroyed", async () => {
    const team = await buildTeam();
    const otherDocument = await buildDocument({ teamId: team.id });
    await otherDocument.destroy();
    const document = await buildDocument({
      teamId: team.id,
      version: 0,
      text: `[ ] checklist item`,
    });
    document.content = parser
      .parse(`[this is a link](${otherDocument.url})`)
      ?.toJSON();
    await document.save();

    const processor = new BacklinksProcessor();
    await processor.perform({
      name: "documents.publish",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: document.createdById,
      ip,
    });
    const backlinks = await Relationship.findAll({
      where: {
        reverseDocumentId: document.id,
        type: RelationshipType.Backlink,
      },
    });
    expect(backlinks.length).toBe(0);
  });

  it("should not create backlink records for cross-team links", async () => {
    const teamA = await buildTeam();
    const teamB = await buildTeam();
    const otherDocument = await buildDocument({ teamId: teamB.id });
    const document = await buildDocument({
      teamId: teamA.id,
      text: `[this is a link](${otherDocument.url})`,
    });

    const processor = new BacklinksProcessor();
    await processor.perform({
      name: "documents.publish",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: document.createdById,
      ip,
    });
    const backlinks = await Relationship.findAll({
      where: {
        reverseDocumentId: document.id,
        type: RelationshipType.Backlink,
      },
    });
    expect(backlinks.length).toBe(0);
  });
});

describe("documents.update", () => {
  it("should not fail on a document with no previous revisions", async () => {
    const team = await buildTeam();
    const otherDocument = await buildDocument({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      text: `[this is a link](${otherDocument.url})`,
    });

    const processor = new BacklinksProcessor();
    await processor.perform({
      name: "documents.update",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: document.createdById,
      createdAt: new Date().toISOString(),
      data: { done: true },
      ip,
    });
    const backlinks = await Relationship.findAll({
      where: {
        reverseDocumentId: document.id,
        type: RelationshipType.Backlink,
      },
    });
    expect(backlinks.length).toBe(1);
  });

  it("should not fail when previous revision is different document version", async () => {
    const team = await buildTeam();
    const otherDocument = await buildDocument({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      version: undefined,
      text: `[ ] checklist item`,
    });
    document.content = parser
      .parse(`[this is a link](${otherDocument.url})`)
      ?.toJSON();
    await document.save();

    const processor = new BacklinksProcessor();
    await processor.perform({
      name: "documents.update",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: document.createdById,
      createdAt: new Date().toISOString(),
      data: { done: true },
      ip,
    });
    const backlinks = await Relationship.findAll({
      where: {
        reverseDocumentId: document.id,
        type: RelationshipType.Backlink,
      },
    });
    expect(backlinks.length).toBe(1);
  });

  it("should create new backlink records", async () => {
    const team = await buildTeam();
    const otherDocument = await buildDocument({ teamId: team.id });
    const document = await buildDocument({ teamId: team.id });
    document.content = parser
      .parse(`[this is a link](${otherDocument.url})`)
      ?.toJSON();
    await document.save();

    const processor = new BacklinksProcessor();
    await processor.perform({
      name: "documents.update",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: document.createdById,
      createdAt: new Date().toISOString(),
      data: { done: true },
      ip,
    });
    const backlinks = await Relationship.findAll({
      where: {
        reverseDocumentId: document.id,
        type: RelationshipType.Backlink,
      },
    });
    expect(backlinks.length).toBe(1);
  });

  it("should destroy removed backlink records", async () => {
    const team = await buildTeam();
    const otherDocument = await buildDocument({ teamId: team.id });
    const yetAnotherDocument = await buildDocument({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      text: `[this is a link](${otherDocument.url})

[this is a another link](${yetAnotherDocument.url})`,
    });

    const processor = new BacklinksProcessor();
    await processor.perform({
      name: "documents.publish",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: document.createdById,
      ip,
    });
    document.content = parser
      .parse(
        `First link is gone

  [this is a another link](${yetAnotherDocument.url})`
      )
      ?.toJSON();
    await document.save();

    await processor.perform({
      name: "documents.update",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: document.createdById,
      createdAt: new Date().toISOString(),
      data: { done: true },
      ip,
    });
    const backlinks = await Relationship.findAll({
      where: {
        reverseDocumentId: document.id,
        type: RelationshipType.Backlink,
      },
    });
    expect(backlinks.length).toBe(1);
    expect(backlinks[0].documentId).toBe(yetAnotherDocument.id);
  });
});

describe("documents.delete", () => {
  it("should destroy related backlinks", async () => {
    const team = await buildTeam();
    const otherDocument = await buildDocument({ teamId: team.id });
    const document = await buildDocument({ teamId: team.id });
    document.content = parser
      .parse(`[this is a link](${otherDocument.url})`)
      ?.toJSON();
    await document.save();

    const processor = new BacklinksProcessor();
    await processor.perform({
      name: "documents.update",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: document.createdById,
      createdAt: new Date().toISOString(),
      data: { done: true },
      ip,
    });

    await processor.perform({
      name: "documents.delete",
      documentId: document.id,
      collectionId: document.collectionId!,
      teamId: document.teamId,
      actorId: document.createdById,
      ip,
    });
    const backlinks = await Relationship.findAll({
      where: {
        reverseDocumentId: document.id,
        type: RelationshipType.Backlink,
      },
    });
    expect(backlinks.length).toBe(0);
  });
});
