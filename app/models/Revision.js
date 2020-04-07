// @flow
import { computed } from 'mobx';
import getHeadingsForText from 'shared/utils/getHeadingsForText';
import BaseModel from './BaseModel';
import User from './User';

class Revision extends BaseModel {
  id: string;
  documentId: string;
  title: string;
  text: string;
  createdAt: string;
  createdBy: User;

  @computed
  get headings() {
    return getHeadingsForText(this.text);
  }
}

export default Revision;
