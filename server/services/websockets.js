// @flow
import type { Event } from '../events';
import { Document } from '../models';
import { presentDocument } from '../presenters';
import { socketio } from '../';

export default class Websockets {
  async on(event: Event) {
    switch (event.name) {
      case 'documents.publish':
      case 'documents.update':
      case 'documents.move': {
        const document = await Document.findById(event.model.id);
        const namespace = socketio.of(document.teamId);

        return namespace.emit('entities', {
          event: event.name,
          documents: [await presentDocument(document)],
        });
      }
      default:
    }
  }
}
