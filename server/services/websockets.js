// @flow
import type { Event } from '../events';
import { Document } from '../models';
import { presentDocument } from '../presenters';
import { socketio } from '../';

export default class Websockets {
  async on(event: Event) {
    switch (event.name) {
      case 'documents.publish':
      case 'documents.restore':
      case 'documents.archive':
      case 'documents.unarchive':
      case 'documents.pin':
      case 'documents.unpin':
      case 'documents.update':
      case 'documents.delete': {
        const document = await Document.findById(event.modelId, {
          paranoid: true,
        });

        return socketio.to(document.teamId).emit('entities', {
          event: event.name,
          documents: [await presentDocument(document)],
        });
      }
      case 'documents.create': {
        const document = await Document.findById(event.modelId);

        return socketio.to(event.actorId).emit('entities', {
          event: event.name,
          documents: [await presentDocument(document)],
        });
      }
      case 'documents.star':
      case 'documents.unstar': {
        return socketio.to(event.actorId).emit(event.name, {
          documentId: event.modelId,
        });
      }
      default:
    }
  }
}
