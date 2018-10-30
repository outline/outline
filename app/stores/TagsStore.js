// @flow
import { observable, computed, action, runInAction, ObservableMap } from 'mobx';
import { client } from 'utils/ApiClient';
import { orderBy } from 'lodash';
import invariant from 'invariant';
import BaseStore from './BaseStore';
import UiStore from './UiStore';
import type { Tag, PaginationParams } from 'types';

class TagsStore extends BaseStore {
  @observable data: Map<string, Tag> = new ObservableMap([]);
  @observable isLoaded: boolean = false;
  @observable isFetching: boolean = false;

  ui: UiStore;

  @computed
  get orderedData(): Tag[] {
    return orderBy(this.data.values(), 'name', 'asc');
  }

  @action
  fetchPage = async (options: ?PaginationParams): Promise<*> => {
    this.isFetching = true;

    try {
      const res = await client.post('/tags.list', options);
      invariant(res && res.data, 'Tags not available');
      const { data } = res;
      runInAction('TagsStore#fetchPage', () => {
        data.forEach(revision => {
          this.data.set(revision.id, revision);
        });
        this.isLoaded = true;
      });
      return data;
    } catch (e) {
      this.ui.showToast('Failed to load tags');
    } finally {
      this.isFetching = false;
    }
  };

  @action
  add = (data: Tag): void => {
    this.data.set(data.id, data);
  };

  @action
  remove = (id: string): void => {
    this.data.delete(id);
  };

  getById = (id: string): ?Tag => {
    return this.data.get(id);
  };

  constructor(options: { ui: UiStore }) {
    super();
    this.ui = options.ui;
  }
}

export default TagsStore;
