// @flow
import BaseStore from './BaseStore';
import RootStore from './RootStore';
import ApiKey from 'models/ApiKey';

export default class ApiKeysStore extends BaseStore<ApiKey> {
  actions = ['list', 'create', 'delete'];

  constructor(rootStore: RootStore) {
    super(rootStore, ApiKey);
  }
}
