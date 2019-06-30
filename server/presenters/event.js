// @flow
import { Event } from '../models';

export default function present(event: Event) {
  return {
    id: event.id,
    name: event.name,
    modelId: event.modelId,
    actorId: event.actorId,
    collectionId: event.collectionId,
    documentId: event.documentId,
    createdAt: event.createdAt,
  };
}
