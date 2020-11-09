// @flow
import type { DocumentEvent, RevisionEvent } from "../events";
import { Document, Backlink } from "../models";
import { Op } from "../sequelize";
import parseDocumentIds from "../utils/parseDocumentIds";
import slugify from "../utils/slugify";

export default class Backlinks {
  async on(event: DocumentEvent | RevisionEvent) {
    switch (event.name) {
      case "documents.publish": {
        const document = await Document.findByPk(event.documentId);
        if (!document) return;

        const linkIds = parseDocumentIds(document.text);

        await Promise.all(
          linkIds.map(async (linkId) => {
            const linkedDocument = await Document.findByPk(linkId);
            if (linkedDocument.id === event.documentId) return;

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
        if (!document) return;

        // backlinks are only created for published documents
        if (!document.publishedAt) return;

        const linkIds = parseDocumentIds(document.text);
        const linkedDocumentIds = [];

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
      case "documents.title_change": {
        const document = await Document.findByPk(event.documentId);
        if (!document) return;

        // might as well check
        const { title, previousTitle } = event.data;
        if (!previousTitle || title === previousTitle) break;

        // update any link titles in documents that lead to this one
        const backlinks = await Backlink.findAll({
          where: {
            documentId: event.documentId,
          },
          include: [{ model: Document, as: "reverseDocument" }],
        });

        await Promise.all(
          backlinks.map(async (backlink) => {
            const previousUrl = `/doc/${slugify(previousTitle)}-${
              document.urlId
            }`;

            // find links in the other document that lead to this one and have
            // the old title as anchor text. Go ahead and update those to the
            // new title automatically
            backlink.reverseDocument.text = backlink.reverseDocument.text.replace(
              `[${previousTitle}](${previousUrl})`,
              `[${title}](${document.url})`
            );
            await backlink.reverseDocument.save({
              silent: true,
              hooks: false,
            });
          })
        );

        break;
      }
      case "documents.delete": {
        await Backlink.destroy({
          where: {
            [Op.or]: [
              { reverseDocumentId: event.documentId },
              { documentId: event.documentId },
            ],
          },
        });
        break;
      }
      default:
    }
  }
}
