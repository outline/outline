// @flow
import { difference } from 'lodash';
import type { DocumentEvent } from '../events';
import { Document, Revision, Backlink } from '../models';
import parseLinks from '../../shared/utils/parseLinks';

export default class Backlinks {
  async on(event: DocumentEvent) {
    switch (event.name) {
      case 'documents.create': {
        // TODO
        break;
      }
      case 'documents.update': {
        // no-op for now
        if (event.autosave) return;

        const [currentRevision, previsionRevision] = await Revision.findAll({
          where: { documentId: event.modelId },
          order: [['createdAt', 'desc']],
          limit: 2,
        });
        const previousLinks = parseLinks(previsionRevision.text);
        const currentLinks = parseLinks(currentRevision.text);
        const addedLinks = difference(currentLinks, previousLinks);
        const removedLinks = difference(previousLinks, currentLinks);

        await Promise.all(
          addedLinks.map(async link => {
            const tokens = link.replace(/\/$/, '').split('/');
            const lastToken = tokens[tokens.length - 1];
            console.log({ link, lastToken });
            const document = await Document.findByPk(lastToken);
            await Backlink.create({
              documentId: document.id,
              reverseDocumentId: event.modelId,
              userId: currentRevision.userId,
            });
          })
        );

        await Promise.all(
          removedLinks.map(async link => {
            const tokens = link.replace(/\/$/, '').split('/');
            const lastToken = tokens[tokens.length - 1];
            console.log({ link, lastToken });
            const document = await Document.findByPk(lastToken);
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
        // TODO
        break;
      }
      default:
    }
  }
}
