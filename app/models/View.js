// @flow
import BaseModel from './BaseModel';
import User from './User';

class View extends BaseModel {
  id: string;
  documentId: string;
  firstViewedAt: string;
  lastViewedAt: string;
  count: number;
  user: User;
}

export default View;
