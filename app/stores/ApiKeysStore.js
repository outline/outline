// @flow
import BaseStore from './BaseStore';
import ApiKey from 'models/ApiKey';
import RootStore from 'stores/RootStore';

class ApiKeysStore extends BaseStore<ApiKey> {
  constructor(rootStore: RootStore) {
    super({
      model: ApiKey,
      actions: ['list', 'create', 'delete'],
      rootStore,
    });
  }
}

export default ApiKeysStore;
