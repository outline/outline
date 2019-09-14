// @flow
import BaseModel from './BaseModel';
import User from './User';

class Event extends BaseModel {
  id: string;
  name: string;
  modelId: ?string;
  actorId: string;
  actorIpAddress: ?string;
  documentId: string;
  collectionId: ?string;
  userId: string;
  createdAt: string;
  actor: User;
  data: {
    name: string,
    email: string,
    title: string,
  };

  get model() {
    return this.name.split('.')[0];
  }

  get verb() {
    return this.name.split('.')[1];
  }

  get verbPastTense() {
    const v = this.verb;
    if (v.endsWith('e')) return `${v}d`;
    return `${v}ed`;
  }
}

export default Event;
