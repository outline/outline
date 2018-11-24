// @flow
import BaseModel from './BaseModel';
import User from './User';

class Revision extends BaseModel {
  id: string;
  documentId: string;
  title: string;
  text: string;
  createdAt: string;
  createdBy: User;
}

export default Revision;
