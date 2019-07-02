// @flow
import BaseModel from './BaseModel';
import User from './User';

class Event extends BaseModel {
  id: string;
  name: string;
  modelId: ?string;
  actorId: string;
  documentId: string;
  collectionId: ?string;
  userId: string;
  createdAt: string;
  actor: User;
  data: { name: string };

  toSentance(): string {
    switch (this.name) {
      case 'teams.create':
        return `created the team`;
      case 'users.create':
        return `joined the team`;
      case 'documents.publish':
        return `published ${this.data.name}`;
      case 'documents.update':
        return `updated a document`;
      case 'documents.archive':
        return `archived a document`;
      case 'documents.unarchive':
        return `restored a document`;
      case 'documents.pin':
        return `pinned a document`;
      case 'documents.unpin':
        return `unpinned a document`;
      case 'documents.delete':
        return `deleted a document`;
      case 'collections.create':
        return `created a collection`;
      case 'collections.delete':
        return `deleted a collection`;
      default:
        return '';
    }
  }
}

export default Event;
