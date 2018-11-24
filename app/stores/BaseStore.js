// @flow
import { EventEmitter } from 'fbemitter';
import invariant from 'invariant';
import { observable, action, computed, ObservableMap, runInAction } from 'mobx';
import { orderBy } from 'lodash';
import { client } from 'utils/ApiClient';
import BaseModel from 'models/BaseModel';
import RootStore from 'stores/RootStore';
import type { PaginationParams } from 'types';

type Action = 'list' | 'info' | 'create' | 'update' | 'delete';

function modelNameFromClassName(string) {
  return string.charAt(0).toLowerCase() + string.slice(1);
}

export const DEFAULT_PAGINATION_LIMIT = 25;

class BaseStore<T: BaseModel> extends EventEmitter {
  @observable data: ObservableMap<string, T> = new ObservableMap([]);
  @observable isFetching: boolean = false;
  @observable isSaving: boolean = false;
  @observable isLoaded: boolean = false;

  model: T;
  modelName: string;
  rootStore: RootStore;
  actions: Action[] = ['list', 'info', 'create', 'update', 'delete'];

  constructor({
    model,
    actions,
    rootStore,
  }: {
    actions?: Action[],
    model: T,
    rootStore: RootStore,
  }) {
    super();

    this.model = model;
    this.modelName = modelNameFromClassName(model.name);
    if (actions) this.actions = actions;
    this.on = this.addListener;
  }

  @action
  clear = () => {
    this.data.clear();
  };

  @action
  add = (item: *): void => {
    const Model = this.model;

    if (!(item instanceof Model)) {
      item = new Model(item, this);
    }

    this.data.set(item.id, item);
    return item;
  };

  @action
  remove = (id: string): void => {
    this.data.delete(id);
  };

  @action
  create = async (params: Object) => {
    if (!this.actions.includes('create')) {
      throw new Error(`Cannot create ${this.modelName}`);
    }
    this.isSaving = true;

    try {
      const res = await client.post(`/${this.modelName}s.create`, params);

      invariant(res && res.data, 'Data should be available');
      runInAction(`create#${this.modelName}`, () => this.add(res.data));
    } finally {
      this.isSaving = false;
    }
  };

  @action
  delete = async (params: Object) => {
    if (!this.actions.includes('delete')) {
      throw new Error(`Cannot delete ${this.modelName}`);
    }
    this.isSaving = true;

    try {
      await client.post(`/${this.modelName}s.delete`, params);
      runInAction(`delete#${this.modelName}`, () => this.remove(params.id));
    } finally {
      this.isSaving = false;
    }
  };

  @action
  fetchPage = async (params: ?PaginationParams): Promise<*> => {
    if (!this.actions.includes('list')) {
      throw new Error(`Cannot list ${this.modelName}`);
    }
    this.isFetching = true;

    try {
      const res = await client.post(`/${this.modelName}s.list`, params);

      invariant(res && res.data, 'Data not available');
      runInAction(`list#${this.modelName}`, () => {
        res.data.forEach(this.add);

        if (res.data.length < res.pagination.limit) {
          this.isLoaded = true;
        }
      });
    } finally {
      this.isFetching = false;
    }
  };

  @computed
  get orderedData(): T[] {
    return orderBy(this.data.values(), 'createdAt', 'desc');
  }

  getById = (id: string): ?T => {
    return this.data.get(id);
  };
}

export default BaseStore;
