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

        // Note: These can be UUID or slugs
        const linkIds = DocumentHelper.parseDocumentIds(document);
        const linkedDocuments = await this.findLinkedDocuments(
          linkIds,
          document
        );

        await this.createMissingBacklinks(linkedDocuments, document);
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
        const linkedDocuments = await this.findLinkedDocuments(
          linkIds,
          document
        );

        // create or find existing backlink records for referenced docs
        await this.createMissingBacklinks(linkedDocuments, document);

        // delete any backlinks that no longer exist
        await Relationship.destroy({
          where: {
            documentId: {
              [Op.notIn]: linkedDocuments.map((doc) => doc.id),
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
   * Load all documents referenced by the given link identifiers in a single
   * query, restricted to the same team and excluding the source document.
   *
   * @param linkIds document identifiers parsed from the document body, either
   *   UUIDs or url slugs.
   * @param document the source document containing the links.
   * @returns array of linked documents with minimal attributes.
   */
  private async findLinkedDocuments(linkIds: string[], document: Document) {
    const ids: string[] = [];
    const urlIds: string[] = [];

    for (const linkId of linkIds) {
      if (isUUID(linkId)) {
        ids.push(linkId);
      } else {
        const match = linkId.match(UrlHelper.SLUG_URL_REGEX);
        if (match) {
          urlIds.push(match[1]);
        }
      }
    }

    if (ids.length === 0 && urlIds.length === 0) {
      return [];
    }

    return Document.unscoped().findAll({
      attributes: ["id", "teamId"],
      where: {
        teamId: document.teamId,
        id: {
          [Op.ne]: document.id,
        },
        [Op.or]: [
          ...(ids.length > 0 ? [{ id: { [Op.in]: ids } }] : []),
          ...(urlIds.length > 0 ? [{ urlId: { [Op.in]: urlIds } }] : []),
        ],
      },
    });
  }

  /**
   * Create backlink relationships from the source document to each linked
   * document that does not already have one, using bulk queries.
   *
   * @param linkedDocuments the documents referenced by the source document.
   * @param document the source document containing the links.
   */
  private async createMissingBacklinks(
    linkedDocuments: Document[],
    document: Document
  ) {
    if (linkedDocuments.length === 0) {
      return;
    }

    const existing = await Relationship.findAll({
      attributes: ["documentId"],
      where: {
        documentId: {
          [Op.in]: linkedDocuments.map((doc) => doc.id),
        },
        reverseDocumentId: document.id,
        type: RelationshipType.Backlink,
      },
    });
    const existingIds = new Set(existing.map((rel) => rel.documentId));

    const missing = linkedDocuments
      .filter((doc) => !existingIds.has(doc.id))
      .map((doc) => ({
        documentId: doc.id,
        reverseDocumentId: document.id,
        userId: document.lastModifiedById,
        type: RelationshipType.Backlink,
      }));

    if (missing.length > 0) {
      await Relationship.bulkCreate(missing);
    }
  }
}
