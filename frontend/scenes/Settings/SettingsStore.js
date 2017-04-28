import { observable, action, runInAction, toJS } from 'mobx';
import { client } from 'utils/ApiClient';

class SearchStore {
  @observable apiKeys = [];
  @observable keyName;

  @observable isFetching;

  @action fetchApiKeys = async () => {
    this.isFetching = true;

    try {
      const res = await client.post('/apiKeys.list');
      const { data } = res;
      runInAction('fetchApiKeys', () => {
        this.apiKeys = data;
      });
    } catch (e) {
      console.error('Something went wrong');
    }
    this.isFetching = false;
  };

  @action createApiKey = async () => {
    this.isFetching = true;

    try {
      const res = await client.post('/apiKeys.create', {
        name: `${this.keyName}` || 'Untitled key',
      });
      const { data } = res;
      runInAction('createApiKey', () => {
        this.apiKeys.push(data);
        this.keyName = '';
      });
    } catch (e) {
      console.error('Something went wrong');
    }
    this.isFetching = false;
  };

  @action deleteApiKey = async id => {
    this.isFetching = true;

    try {
      await client.post('/apiKeys.delete', {
        id,
      });
      runInAction('deleteApiKey', () => {
        this.fetchApiKeys();
      });
    } catch (e) {
      console.error('Something went wrong');
    }
    this.isFetching = false;
  };

  @action setKeyName = value => {
    this.keyName = value.target.value;
  };

  constructor() {
    this.fetchApiKeys();
  }
}

export default SearchStore;
