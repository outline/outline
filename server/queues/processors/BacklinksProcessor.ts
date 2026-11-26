import { Op } from "sequelize";
import isUUID from "validator/lib/isUUID";
import { UrlHelper } from "@shared/utils/UrlHelper";
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

        await this.createBacklinks(document);
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

        const linkedDocumentIds = await this.createBacklinks(document);

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

  /**
   * Creates backlink records for every document referenced by the given document.
   *
   * @param document the source document.
   * @returns the ids of the linked documents.
   */
  private async createBacklinks(document: Document): Promise<string[]> {
    // Note: These can be UUID or slugs
    const linkIds = DocumentHelper.parseDocumentIds(document);
    const ids: string[] = [];
    const urlIds: string[] = [];

    for (const linkId of linkIds) {
      if (isUUID(linkId)) {
        ids.push(linkId);
        continue;
      }

      const match = linkId.match(UrlHelper.SLUG_URL_REGEX);
      if (match) {
        urlIds.push(match[1]);
      }
    }

    if (!ids.length && !urlIds.length) {
      return [];
    }

    const linkedDocuments = await Document.unscoped().findAll({
      attributes: ["id"],
      where: {
        teamId: document.teamId,
        template: false,
        id: { [Op.ne]: document.id },
        [Op.or]: [{ id: ids }, { urlId: urlIds }],
      },
    });
    const linkedDocumentIds = linkedDocuments.map((linked) => linked.id);

    if (!linkedDocumentIds.length) {
      return [];
    }

    const existing = await Relationship.findAll({
      attributes: ["documentId"],
      where: {
        documentId: linkedDocumentIds,
        reverseDocumentId: document.id,
        type: RelationshipType.Backlink,
      },
    });
    const existingIds = new Set(existing.map((r) => r.documentId));

    await Promise.all(
      linkedDocumentIds
        .filter((id) => !existingIds.has(id))
        .map((id) =>
          Relationship.create({
            documentId: id,
            reverseDocumentId: document.id,
            userId: document.lastModifiedById,
            type: RelationshipType.Backlink,
          })
        )
    );

    return linkedDocumentIds;
  }
}
