import { Op } from "sequelize";
import { Document, Backlink } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { Event, DocumentEvent, RevisionEvent } from "@server/types";
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
        const linkIds = DocumentHelper.parseDocumentIds(document);
        await Promise.all(
          linkIds.map(async (linkId) => {
            const linkedDocument = await Document.findByPk(linkId);

            if (!linkedDocument || linkedDocument.id === event.documentId) {
              return;
            }

            await Backlink.findOrCreate({
              where: {
                documentId: linkedDocument.id,
                reverseDocumentId: event.documentId,
              },
              defaults: {
                userId: document.lastModifiedById,
              },
            });
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
            const linkedDocument = await Document.findByPk(linkId);

            if (!linkedDocument || linkedDocument.id === event.documentId) {
              return;
            }

            await Backlink.findOrCreate({
              where: {
                documentId: linkedDocument.id,
                reverseDocumentId: event.documentId,
              },
              defaults: {
                userId: document.lastModifiedById,
              },
            });
            linkedDocumentIds.push(linkedDocument.id);
          })
        );

        // delete any backlinks that no longer exist
        await Backlink.destroy({
          where: {
            documentId: {
              [Op.notIn]: linkedDocumentIds,
            },
            reverseDocumentId: event.documentId,
          },
        });
        break;
      }

      case "documents.delete": {
        await Backlink.destroy({
          where: {
            [Op.or]: [
              {
                reverseDocumentId: event.documentId,
              },
              {
                documentId: event.documentId,
              },
            ],
          },
        });
        break;
      }

      default:
    }
  }
}
