import { Op } from "sequelize";
import { PropertyType } from "@shared/types";
import { Collection, Document, Relationship } from "@server/models";
import { RelationshipType } from "@server/models/Relationship";
import type { DocumentEvent, Event } from "@server/types";
import BaseProcessor from "./BaseProcessor";

/**
 * Mirrors the relation property values of a document into the relationships
 * table so that reverse lookups ("which documents reference this one?") are
 * a simple indexed query. Rows use the same direction as backlinks: the
 * `documentId` is the referenced document and the `reverseDocumentId` is the
 * document holding the relation value.
 */
export default class RelationsProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "documents.publish",
    "documents.update",
  ];

  async perform(event: DocumentEvent) {
    const document = await Document.findByPk(event.documentId);
    if (!document || !document.collectionId) {
      return;
    }

    const collection = await Collection.findByPk(document.collectionId);
    const relationProperties = (collection?.dataSchema ?? []).filter(
      (property) => property.type === PropertyType.Relation
    );

    const referencedIds = Array.from(
      new Set(
        relationProperties.flatMap((property) => {
          const value = document.properties?.[property.id];
          return Array.isArray(value)
            ? value.filter((id): id is string => typeof id === "string")
            : [];
        })
      )
    );

    for (const referencedId of referencedIds) {
      const existing = await Relationship.findOne({
        where: {
          documentId: referencedId,
          reverseDocumentId: document.id,
          type: RelationshipType.Relation,
        },
      });
      if (!existing) {
        await Relationship.create({
          documentId: referencedId,
          reverseDocumentId: document.id,
          userId: document.lastModifiedById,
          type: RelationshipType.Relation,
        });
      }
    }

    // remove rows for documents that are no longer referenced
    await Relationship.destroy({
      where: {
        ...(referencedIds.length > 0
          ? { documentId: { [Op.notIn]: referencedIds } }
          : {}),
        reverseDocumentId: document.id,
        type: RelationshipType.Relation,
      },
    });
  }
}
