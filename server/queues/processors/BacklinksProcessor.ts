import { Op } from "sequelize";
import { Document, Relationship } from "@server/models";
import { RelationshipType } from "@server/models/Relationship";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import type { Event, DocumentEvent, RevisionEvent } from "@server/types";
import BaseProcessor from "./BaseProcessor";

export default class BacklinksProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "documents.publish",
    "documents.update",
    "documents.delete",
  ];

  async perform(event: DocumentEvent | RevisionEvent) {
    switch (event.name) {
      case "documents.publish": {
        const document = await Document.findByPk(event.documentId);
        if (!document) {
          return;
        }

        // Note: These can be UUID or slugs
        const linkIds = DocumentHelper.parseDocumentIds(document);

        await Promise.all(
          linkIds.map(async (linkId) => {
            const linkedDocument = await Document.findByPk(linkId, {
              attributes: ["id"],
            });

            if (!linkedDocument || linkedDocument.id === event.documentId) {
              return;
            }

            const existing = await Relationship.findOne({
              where: {
                documentId: linkedDocument.id,
                reverseDocumentId: event.documentId,
                type: RelationshipType.Backlink,
              },
            });

            if (!existing) {
              await Relationship.create({
                documentId: linkedDocument.id,
                reverseDocumentId: event.documentId,
                userId: document.lastModifiedById,
                type: RelationshipType.Backlink,
              });
            }
          })
        );
        break;
      }

      case "documents.update": {
        const document = await Document.findByPk(event.documentId);
        if (!document) {
          return;
        }

        // backlinks are only created for published documents
        if (!document.publishedAt) {
          return;
        }

        const linkIds = DocumentHelper.parseDocumentIds(document);
        const linkedDocumentIds: string[] = [];

        // create or find existing backlink records for referenced docs
        await Promise.all(
          linkIds.map(async (linkId) => {
            const linkedDocument = await Document.findByPk(linkId, {
              attributes: ["id"],
            });

            if (!linkedDocument || linkedDocument.id === event.documentId) {
              return;
            }

            const existing = await Relationship.findOne({
              where: {
                documentId: linkedDocument.id,
                reverseDocumentId: event.documentId,
                type: RelationshipType.Backlink,
              },
            });

            if (!existing) {
              await Relationship.create({
                documentId: linkedDocument.id,
                reverseDocumentId: event.documentId,
                userId: document.lastModifiedById,
                type: RelationshipType.Backlink,
              });
            }
            linkedDocumentIds.push(linkedDocument.id);
          })
        );

        // delete any backlinks that no longer exist
        await Relationship.destroy({
          where: {
            documentId: {
              [Op.notIn]: linkedDocumentIds,
            },
            reverseDocumentId: event.documentId,
            type: RelationshipType.Backlink,
          },
        });
        break;
      }

      case "documents.delete": {
        await Relationship.destroy({
          where: {
            [Op.or]: [
              {
                reverseDocumentId: event.documentId,
              },
              {
                documentId: event.documentId,
              },
            ],
            type: RelationshipType.Backlink,
          },
        });
        break;
      }

      default:
    }
  }
}
