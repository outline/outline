// @flow
import { observable, action } from 'mobx';
import invariant from 'invariant';
import { client } from 'utils/ApiClient';

type Options = {
  history: Object,
};

class CollectionNewStore {
  @observable name: string;
  @observable error: Object;
  @observable description: string;
  @observable isSaving: boolean = false;

  history: Object;

  @action saveCollection = async () => {
    this.isSaving = true;

    try {
      const res = await client.post('/collections.create', {
        name: this.name,
        description: this.description,
      });
      invariant(res && res.data, 'Data should be available');
      const { url } = res.data;
      this.history.push(url);
    } catch (err) {
      console.error('Something went wrong');
      this.error = err.data;
    }
    this.isSaving = false;
  };

  @action updateName = (name: string) => {
    this.name = name;
  };

  @action updateDescription = (description: string) => {
    this.description = description;
  };

  constructor(options: Options) {
    this.history = options.history;
  }
}

export default CollectionNewStore;
