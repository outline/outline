// @flow
import { action } from 'mobx';
import BaseModel from './BaseModel';
import User from './User';

class View extends BaseModel {
  id: string;
  documentId: string;
  firstViewedAt: string;
  lastViewedAt: string;
  count: number;
  user: User;

  @action
  touch() {
    this.lastViewedAt = new Date().toString();
  }
}

export default View;
