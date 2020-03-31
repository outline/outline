// @flow
import invariant from 'invariant';
import { observable, set, action, computed, runInAction } from 'mobx';
import { orderBy } from 'lodash';
import { client } from 'utils/ApiClient';
import RootStore from 'stores/RootStore';
import BaseModel from '../models/BaseModel';
import type { PaginationParams } from 'types';

type Action = 'list' | 'info' | 'create' | 'update' | 'delete';

function modelNameFromClassName(string) {
  return string.charAt(0).toLowerCase() + string.slice(1);
}

export const DEFAULT_PAGINATION_LIMIT = 25;

export default class BaseStore<T: BaseModel> {
  @observable data: Map<string, T> = new Map();
  @observable isFetching: boolean = false;
  @observable isSaving: boolean = false;
  @observable isLoaded: boolean = false;

  model: Class<T>;
  modelName: string;
  rootStore: RootStore;
  actions: Action[] = ['list', 'info', 'create', 'update', 'delete'];

  constructor(rootStore: RootStore, model: Class<T>) {
    this.rootStore = rootStore;
    this.model = model;
    this.modelName = modelNameFromClassName(model.name);
  }

  @action
  clear() {
    this.data.clear();
  }

  addPolicies = policies => {
    if (policies) {
      policies.forEach(policy => this.rootStore.policies.add(policy));
    }
  };

  @action
  add = (item: Object): T => {
    const Model = this.model;

    if (!(item instanceof Model)) {
      const existing: ?T = this.data.get(item.id);
      if (existing) {
        set(existing, item);
        return existing;
      } else {
        item = new Model(item, this);
      }
    }

    this.data.set(item.id, item);
    return item;
  };

  @action
  remove(id: string): void {
    this.data.delete(id);
  }

  save(params: Object) {
    if (params.id) return this.update(params);
    return this.create(params);
  }

  get(id: string): ?T {
    return this.data.get(id);
  }

  @action
  async create(params: Object) {
    if (!this.actions.includes('create')) {
      throw new Error(`Cannot create ${this.modelName}`);
    }
    this.isSaving = true;

    try {
      const res = await client.post(`/${this.modelName}s.create`, params);

      invariant(res && res.data, 'Data should be available');

      this.addPolicies(res.policies);
      return this.add(res.data);
    } finally {
      this.isSaving = false;
    }
  }

  @action
  async update(params: Object): * {
    if (!this.actions.includes('update')) {
      throw new Error(`Cannot update ${this.modelName}`);
    }
    this.isSaving = true;

    try {
      const res = await client.post(`/${this.modelName}s.update`, params);

      invariant(res && res.data, 'Data should be available');

      this.addPolicies(res.policies);
      return this.add(res.data);
    } finally {
      this.isSaving = false;
    }
  }

  @action
  async delete(item: T, options?: Object = {}) {
    if (!this.actions.includes('delete')) {
      throw new Error(`Cannot delete ${this.modelName}`);
    }
    this.isSaving = true;

    try {
      await client.post(`/${this.modelName}s.delete`, {
        id: item.id,
        ...options,
      });
      return this.remove(item.id);
    } finally {
      this.isSaving = false;
    }
  }

  @action
  async fetch(id: string, options?: Object = {}): Promise<*> {
    if (!this.actions.includes('info')) {
      throw new Error(`Cannot fetch ${this.modelName}`);
    }

    let item = this.data.get(id);
    if (item && !options.force) return item;

    this.isFetching = true;

    try {
      const res = await client.post(`/${this.modelName}s.info`, { id });
      invariant(res && res.data, 'Data should be available');

      this.addPolicies(res.policies);
      return this.add(res.data);
    } catch (err) {
      if (err.statusCode === 403) {
        this.remove(id);
      }
      throw err;
    } finally {
      this.isFetching = false;
    }
  }

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
        this.addPolicies(res.policies);
        res.data.forEach(this.add);
        this.isLoaded = true;
      });
      return res.data;
    } finally {
      this.isFetching = false;
    }
  };

  @computed
  get orderedData(): T[] {
    return orderBy(Array.from(this.data.values()), 'createdAt', 'desc');
  }
}
