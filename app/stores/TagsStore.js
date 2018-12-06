// @flow
import { sortBy } from 'lodash';
import { action, computed } from 'mobx';
import { client } from 'utils/ApiClient';
import BaseStore from './BaseStore';
import RootStore from './RootStore';
import Tag from 'models/Tag';

export default class TagsStore extends BaseStore<Tag> {
  actions = ['list'];

  constructor(rootStore: RootStore) {
    super(rootStore, Tag);
  }
}