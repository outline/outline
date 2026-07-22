import { v4 as uuidv4 } from "uuid";
import { PropertyType } from "@shared/types";
import { Relationship } from "@server/models";
import { RelationshipType } from "@server/models/Relationship";
import {
  buildCollection,
  buildDocument,
  buildTeam,
} from "@server/test/factories";
import RelationsProcessor from "./RelationsProcessor";

const ip = "127.0.0.1";

async function buildDatabaseFixture() {
  const team = await buildTeam();
  const propertyId = uuidv4();
  const collection = await buildCollection({
    teamId: team.id,
    dataSchema: [
      {
        id: propertyId,
        name: "Linked",
        type: PropertyType.Relation,
      },
    ],
  });
  return { team, collection, propertyId };
}

describe("RelationsProcessor", () => {
  it("should create relationship records for relation values", async () => {
    const { team, collection, propertyId } = await buildDatabaseFixture();
    const target = await buildDocument({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
      properties: { [propertyId]: [target.id] },
    });

    const processor = new RelationsProcessor();
    await processor.perform({
      name: "documents.update",
      documentId: document.id,
      collectionId: collection.id,
      teamId: team.id,
      actorId: document.createdById,
      createdAt: document.updatedAt.toISOString(),
      data: { done: true },
      ip,
    });

    const relations = await Relationship.findAll({
      where: {
        reverseDocumentId: document.id,
        type: RelationshipType.Relation,
      },
    });
    expect(relations.length).toBe(1);
    expect(relations[0].documentId).toBe(target.id);
  });

  it("should remove relationship records for removed values", async () => {
    const { team, collection, propertyId } = await buildDatabaseFixture();
    const target = await buildDocument({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
      properties: { [propertyId]: [target.id] },
    });

    const processor = new RelationsProcessor();
    const event = {
      name: "documents.update" as const,
      documentId: document.id,
      collectionId: collection.id,
      teamId: team.id,
      actorId: document.createdById,
      createdAt: document.updatedAt.toISOString(),
      data: { done: true },
      ip,
    };
    await processor.perform(event);

    document.properties = {};
    document.changed("properties", true);
    await document.save({ silent: true });
    await processor.perform(event);

    const relations = await Relationship.findAll({
      where: {
        reverseDocumentId: document.id,
        type: RelationshipType.Relation,
      },
    });
    expect(relations.length).toBe(0);
  });

  it("should not duplicate existing relationship records", async () => {
    const { team, collection, propertyId } = await buildDatabaseFixture();
    const target = await buildDocument({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
      properties: { [propertyId]: [target.id] },
    });

    const processor = new RelationsProcessor();
    const event = {
      name: "documents.update" as const,
      documentId: document.id,
      collectionId: collection.id,
      teamId: team.id,
      actorId: document.createdById,
      createdAt: document.updatedAt.toISOString(),
      data: { done: true },
      ip,
    };
    await processor.perform(event);
    await processor.perform(event);

    const relations = await Relationship.findAll({
      where: {
        reverseDocumentId: document.id,
        type: RelationshipType.Relation,
      },
    });
    expect(relations.length).toBe(1);
  });
});
