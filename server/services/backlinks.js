// @flow
import { difference } from 'lodash';
import type { DocumentEvent } from '../events';
import { Document, Revision, Backlink } from '../models';
import parseDocumentIds from '../../shared/utils/parseDocumentIds';

export default class Backlinks {
  async on(event: DocumentEvent) {
    switch (event.name) {
      case 'documents.publish': {
        const document = await Document.findByPk(event.modelId);
        const linkIds = parseDocumentIds(document.text);

        await Promise.all(
          linkIds.map(async linkId => {
            const linkedDocument = await Document.findByPk(linkId);
            if (linkedDocument.id === event.modelId) return;

            await Backlink.findOrCreate({
              where: {
                documentId: linkedDocument.id,
                reverseDocumentId: event.modelId,
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
        if (event.autosave) return;

        // no-op for drafts
        const document = await Document.findByPk(event.modelId);
        if (!document.publishedAt) return;

        const [currentRevision, previsionRevision] = await Revision.findAll({
          where: { documentId: event.modelId },
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
            if (linkedDocument.id === event.modelId) return;

            await Backlink.findOrCreate({
              where: {
                documentId: linkedDocument.id,
                reverseDocumentId: event.modelId,
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
                reverseDocumentId: event.modelId,
              },
            });
          })
        );
        break;
      }
      case 'documents.delete': {
        await Backlink.destroy({
          where: {
            reverseDocumentId: event.modelId,
          },
        });
        await Backlink.destroy({
          where: {
            documentId: event.modelId,
          },
        });
        break;
      }
      default:
    }
  }
}
