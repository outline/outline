import { Document, Backlink, Team } from "@server/models";
import { Op } from "@server/sequelize";
import parseDocumentIds from "@server/utils/parseDocumentIds";
import slugify from "@server/utils/slugify";
import { DocumentEvent, RevisionEvent } from "../../types";

export default class BacklinksProcessor {
  async on(event: DocumentEvent | RevisionEvent) {
    switch (event.name) {
      case "documents.publish": {
        const document = await Document.findByPk(event.documentId);
        if (!document) return;
        const linkIds = parseDocumentIds(document.text);
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
        if (!document) return;
        // backlinks are only created for published documents
        if (!document.publishedAt) return;
        const linkIds = parseDocumentIds(document.text);
        // @ts-expect-error ts-migrate(7034) FIXME: Variable 'linkedDocumentIds' implicitly has type '... Remove this comment to see the full error message
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
              // @ts-expect-error ts-migrate(7005) FIXME: Variable 'linkedDocumentIds' implicitly has an 'an... Remove this comment to see the full error message
              [Op.notIn]: linkedDocumentIds,
            },
            reverseDocumentId: event.documentId,
          },
        });
        break;
      }

      case "documents.title_change": {
        // might as well check
        const { title, previousTitle } = event.data;
        if (!previousTitle || title === previousTitle) break;
        const document = await Document.findByPk(event.documentId);
        if (!document) return;
        // TODO: Handle re-writing of titles into CRDT
        const team = await Team.findByPk(document.teamId);

        if (team?.collaborativeEditing) {
          break;
        }

        // update any link titles in documents that lead to this one
        const backlinks = await Backlink.findAll({
          where: {
            documentId: event.documentId,
          },
          include: [
            {
              model: Document,
              as: "reverseDocument",
            },
          ],
        });
        await Promise.all(
          // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'backlink' implicitly has an 'any' type.
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
