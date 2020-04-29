// @flow
import { difference } from 'lodash';
import type { DocumentEvent } from '../events';
import { Document, Revision, Backlink } from '../models';
import parseDocumentIds from '../../shared/utils/parseDocumentIds';
import slugify from '../utils/slugify';

export default class Backlinks {
  async on(event: DocumentEvent) {
    switch (event.name) {
      case 'documents.publish': {
        const document = await Document.findByPk(event.documentId);
        const linkIds = parseDocumentIds(document.text);

        await Promise.all(
          linkIds.map(async linkId => {
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
      case 'documents.update': {
        // no-op for now
        if (event.data.autosave) return;

        // no-op for drafts
        const document = await Document.findByPk(event.documentId);
        if (!document.publishedAt) return;

        const [currentRevision, previousRevision] = await Revision.findAll({
          where: { documentId: event.documentId },
          order: [['createdAt', 'desc']],
          limit: 2,
        });
        const previousLinkIds = previousRevision
          ? parseDocumentIds(previousRevision.text)
          : [];
        const currentLinkIds = parseDocumentIds(currentRevision.text);
        const addedLinkIds = difference(currentLinkIds, previousLinkIds);
        const removedLinkIds = difference(previousLinkIds, currentLinkIds);

        // add any new backlinks that were created
        await Promise.all(
          addedLinkIds.map(async linkId => {
            const linkedDocument = await Document.findByPk(linkId);
            if (linkedDocument.id === event.documentId) return;

            await Backlink.findOrCreate({
              where: {
                documentId: linkedDocument.id,
                reverseDocumentId: event.documentId,
              },
              defaults: {
                userId: currentRevision.userId,
              },
            });
          })
        );

        // delete any backlinks that were removed
        await Promise.all(
          removedLinkIds.map(async linkId => {
            const document = await Document.findByPk(linkId, {
              paranoid: false,
            });
            if (document) {
              await Backlink.destroy({
                where: {
                  documentId: document.id,
                  reverseDocumentId: event.documentId,
                },
              });
            }
          })
        );

        if (
          !previousRevision ||
          currentRevision.title === previousRevision.title
        ) {
          break;
        }

        // update any link titles in documents that lead to this one
        const backlinks = await Backlink.findAll({
          where: {
            documentId: event.documentId,
          },
          include: [{ model: Document, as: 'reverseDocument' }],
        });

        await Promise.all(
          backlinks.map(async backlink => {
            const previousUrl = `/doc/${slugify(previousRevision.title)}-${
              document.urlId
            }`;

            // find links in the other document that lead to this one and have
            // the old title as anchor text. Go ahead and update those to the
            // new title automatically
            backlink.reverseDocument.text = backlink.reverseDocument.text.replace(
              `[${previousRevision.title}](${previousUrl})`,
              `[${document.title}](${document.url})`
            );
            await backlink.reverseDocument.save({
              silent: true,
              hooks: false,
            });
          })
        );

        break;
      }
      case 'documents.delete': {
        await Backlink.destroy({
          where: {
            reverseDocumentId: event.documentId,
          },
        });
        await Backlink.destroy({
          where: {
            documentId: event.documentId,
          },
        });
        break;
      }
      default:
    }
  }
}
