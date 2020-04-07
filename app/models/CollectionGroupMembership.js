// @flow
import { computed } from 'mobx';
import BaseModel from './BaseModel';

class CollectionGroupMembership extends BaseModel {
  id: string;
  groupId: string;
  collectionId: string;
  permission: string;

  @computed
  get isEditor(): boolean {
    return this.permission === 'read_write';
  }

  @computed
  get isMaintainer(): boolean {
    return this.permission === 'maintainer';
  }
}

export default CollectionGroupMembership;
