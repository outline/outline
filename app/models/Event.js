// @flow
import BaseModel from './BaseModel';

class Event extends BaseModel {
  id: string;
  modelId: string;
  actorId: string;
  documentId: string;
  collectionId: string;
  userId: string;
  createdAt: string;
}

export default Event;
