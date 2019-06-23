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
        const document = await Document.findByPk(event.modelId, {
          paranoid: false,
        });
        const documents = [await presentDocument(document)];
        const collections = [await presentCollection(document.collection)];

        return socketio
          .to(`collection-${document.collectionId}`)
          .emit('entities', {
            event: event.name,
            documents,
            collections,
          });
      }
      case 'documents.create': {
        const document = await Document.findByPk(event.modelId);
        const documents = [await presentDocument(document)];
        const collections = [await presentCollection(document.collection)];

        return socketio.to(`user-${event.actorId}`).emit('entities', {
          event: event.name,
          documents,
          collections,
        });
      }
      case 'documents.star':
      case 'documents.unstar': {
        return socketio.to(`user-${event.actorId}`).emit(event.name, {
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
          const documents = [await presentDocument(document)];
          socketio.to(`collection-${document.collectionId}`).emit('entities', {
            event: event.name,
            documents,
          });
        });
        collections.forEach(async collection => {
          const collections = [await presentCollection(collection)];
          socketio.to(`collection-${collection.id}`).emit('entities', {
            event: event.name,
            collections,
          });
        });
        return;
      }
      case 'collections.create': {
        const collection = await Collection.findByPk(event.modelId, {
          paranoid: false,
        });
        const collections = [await presentCollection(collection)];

        socketio
          .to(
            collection.private
              ? `collection-${collection.id}`
              : `team-${collection.teamId}`
          )
          .emit('entities', {
            event: event.name,
            collections,
          });
        return socketio
          .to(
            collection.private
              ? `collection-${collection.id}`
              : `team-${collection.teamId}`
          )
          .emit('join', {
            event: event.name,
            roomId: collection.id,
          });
      }
      case 'collections.update':
      case 'collections.delete': {
        const collection = await Collection.findByPk(event.modelId, {
          paranoid: false,
        });
        const collections = [await presentCollection(collection)];

        return socketio.to(`collection-${collection.id}`).emit('entities', {
          event: event.name,
          collections,
        });
      }
      case 'collections.add_user':
        return socketio.to(`user-${event.modelId}`).emit('join', {
          event: event.name,
          roomId: event.collectionId,
        });
      case 'collections.remove_user':
        return socketio.to(`user-${event.modelId}`).emit('leave', {
          event: event.name,
          roomId: event.collectionId,
        });

      default:
    }
  }
}
