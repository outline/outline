import { randomUUID } from "node:crypto";
import type { ProsemirrorData } from "@shared/types";
import { MentionType } from "@shared/types";
import { parser } from "@server/editor";
import { Relationship } from "@server/models";
import type { Document } from "@server/models";
import { RelationshipType } from "@server/models/Relationship";
import { sequelize } from "@server/storage/database";
import { buildDocument, buildTeam } from "@server/test/factories";

import BacklinksProcessor from "./BacklinksProcessor";

const ip = "127.0.0.1";

const mention = (target: Document): ProsemirrorData => ({
  type: "mention",
  attrs: {
    id: randomUUID(),
    type: MentionType.Document,
    modelId: target.id,
    label: target.title,
  },
});

const link = (target: Document): ProsemirrorData => ({
  type: "text",
  text: target.title,
  marks: [{ type: "link", attrs: { href: target.url } }],
});

const paragraphs = (nodes: ProsemirrorData[]): ProsemirrorData => ({
  type: "doc",
  content: nodes.map((node) => ({ type: "paragraph", content: [node] })),
});

const publish = (document: Document) =>
  new BacklinksProcessor().perform({
    name: "documents.publish",
    documentId: document.id,
    collectionId: document.collectionId!,
    teamId: document.teamId,
    actorId: document.createdById,
    ip,
  });

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
  it("should create one backlink per target for mixed UUID and slug links", async () => {
    const team = await buildTeam();
    const first = await buildDocument({ teamId: team.id });
    const second = await buildDocument({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      content: paragraphs([mention(first), link(first), link(second)]),
    });

    await publish(document);

    const backlinks = await Relationship.findAll({
      where: {
        reverseDocumentId: document.id,
        type: RelationshipType.Backlink,
      },
    });
    expect(backlinks.map((b) => b.documentId).sort()).toEqual(
      [first.id, second.id].sort()
    );
  });

  it("should not query documents or relationships per link", async () => {
    const team = await buildTeam();
    const targets = await Promise.all(
      [1, 2, 3, 4].map(() => buildDocument({ teamId: team.id }))
    );
    const countSelects = async (nodes: ProsemirrorData[]) => {
      const document = await buildDocument({
        teamId: team.id,
        content: paragraphs(nodes),
      });
      const spy = vi.spyOn(sequelize, "query");
      try {
        await publish(document);
        const sql = spy.mock.calls.map(([query]) =>
          typeof query === "string" ? query : query.query
        );
        return {
          documents: sql.filter((q) => /^SELECT .* FROM "documents"/s.test(q))
            .length,
          relationships: sql.filter((q) =>
            /^SELECT .* FROM "relationships"/s.test(q)
          ).length,
        };
      } finally {
        spy.mockRestore();
      }
    };

    const one = await countSelects([mention(targets[0])]);
    const many = await countSelects([
      mention(targets[0]),
      link(targets[1]),
      mention(targets[2]),
      link(targets[3]),
    ]);
    expect(many).toEqual(one);
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
