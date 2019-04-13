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
      case 'documents.update': {
        const document = await Document.findById(event.model.id);

        return socketio.to(document.teamId).emit('entities', {
          event: event.name,
          documents: [await presentDocument(document)],
        });
      }
      case 'documents.create': {
        const document = await Document.findById(event.model.id);

        return socketio.to(document.createdById).emit('entities', {
          event: event.name,
          documents: [await presentDocument(document)],
        });
      }
      case 'documents.delete':
      case 'documents.pin':
      case 'documents.unpin': {
        const document = await Document.findById(event.model.id);

        return socketio.to(document.teamId).emit(event.name, {
          documentId: event.model.id,
        });
      }
      case 'documents.star':
      case 'documents.unstar': {
        return socketio.to(event.actorId).emit(event.name, {
          documentId: event.model.id,
        });
      }
      default:
    }
  }
}
