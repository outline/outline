// @flow
import { difference } from 'lodash';
import type { DocumentEvent } from '../events';
import { Document, Revision, Backlink } from '../models';
import parseDocumentIds from '../../shared/utils/parseDocumentIds';

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

        const [currentRevision, previsionRevision] = await Revision.findAll({
          where: { documentId: event.documentId },
          order: [['createdAt', 'desc']],
          limit: 2,
        });
        const previousLinkIds = parseDocumentIds(previsionRevision.text);
        const currentLinkIds = parseDocumentIds(currentRevision.text);
        const addedLinkIds = difference(currentLinkIds, previousLinkIds);
        const removedLinkIds = difference(previousLinkIds, currentLinkIds);

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

        await Promise.all(
          removedLinkIds.map(async linkId => {
            const document = await Document.findByPk(linkId);
            await Backlink.destroy({
              where: {
                documentId: document.id,
                reverseDocumentId: event.documentId,
              },
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
