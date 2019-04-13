// @flow
import type { Event } from '../events';
import { Document, Collection } from '../models';
import { presentDocument, presentCollection } from '../presenters';
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

        return socketio.to(document.collectionId).emit('entities', {
          event: event.name,
          documents: [await presentDocument(document)],
          collections: [await presentCollection(document.collection)],
        });
      }
      case 'documents.create': {
        const document = await Document.findById(event.modelId);

        return socketio.to(event.actorId).emit('entities', {
          event: event.name,
          documents: [await presentDocument(document)],
          collections: [await presentCollection(document.collection)],
        });
      }
      case 'documents.star':
      case 'documents.unstar': {
        return socketio.to(event.actorId).emit(event.name, {
          documentId: event.modelId,
        });
      }
      case 'collections.create': {
        const collection = await Collection.findById(event.modelId, {
          paranoid: true,
        });

        return socketio
          .to(collection.private ? collection.id : collection.teamId)
          .emit('entities', {
            event: event.name,
            collections: [await presentCollection(collection)],
          });
      }
      default:
    }
  }
}
