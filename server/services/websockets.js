// @flow
import type { Event } from '../events';
import { Document, Collection } from '../models';
import { presentDocument, presentCollection } from '../presenters';
import { socketio } from '../';

export default class Websockets {
  async on(event: Event) {
    if (process.env.WEBSOCKETS_ENABLED !== 'true' || !socketio) return;

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
          paranoid: false,
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
      case 'documents.move': {
        const documents = await Document.findAll({
          where: {
            id: event.documentIds,
          },
          paranoid: false,
        });
        const collections = await Collection.findAll({
          where: {
            id: event.collectionIds,
          },
          paranoid: false,
        });
        documents.forEach(async document => {
          socketio.to(document.collectionId).emit('entities', {
            event: event.name,
            documents: [await presentDocument(document)],
          });
        });
        collections.forEach(async collection => {
          socketio.to(collection.id).emit('entities', {
            event: event.name,
            collections: [await presentCollection(collection)],
          });
        });
        return;
      }
      case 'collections.create': {
        const collection = await Collection.findById(event.modelId, {
          paranoid: false,
        });

        socketio
          .to(collection.private ? collection.id : collection.teamId)
          .emit('entities', {
            event: event.name,
            collections: [await presentCollection(collection)],
          });
        return socketio
          .to(collection.private ? collection.id : collection.teamId)
          .emit('join', {
            event: event.name,
            roomId: collection.id,
          });
      }
      case 'collections.update':
      case 'collections.delete': {
        const collection = await Collection.findById(event.modelId, {
          paranoid: false,
        });

        return socketio.to(collection.id).emit('entities', {
          event: event.name,
          collections: [await presentCollection(collection)],
        });
      }
      case 'collections.add_user':
        return socketio.to(event.modelId).emit('join', {
          event: event.name,
          roomId: event.collectionId,
        });
      case 'collections.remove_user':
        return socketio.to(event.modelId).emit('leave', {
          event: event.name,
          roomId: event.collectionId,
        });

      default:
    }
  }
}
