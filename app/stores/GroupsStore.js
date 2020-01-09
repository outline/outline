// @flow
import BaseStore from './BaseStore';
import RootStore from './RootStore';
import Group from 'models/Group';

export default class GroupsStore extends BaseStore<Group> {
  actions = ['list'];

  constructor(rootStore: RootStore) {
    super(rootStore, Group);
  }
}
