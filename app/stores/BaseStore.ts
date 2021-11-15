import invariant from "invariant";
import { orderBy } from "lodash";
import { observable, set, action, computed, runInAction } from "mobx";
import { Class } from "utility-types";
import RootStore from "stores/RootStore";
import BaseModel from "../models/BaseModel";
import { PaginationParams } from "types";
import { client } from "utils/ApiClient";

type Action = "list" | "info" | "create" | "update" | "delete" | "count";

function modelNameFromClassName(string) {
  return string.charAt(0).toLowerCase() + string.slice(1);
}

export const DEFAULT_PAGINATION_LIMIT = 25;

export const PAGINATION_SYMBOL = Symbol.for("pagination");

export default class BaseStore<T extends BaseModel> {
  @observable
  data: Map<string, T> = new Map();

  @observable
  isFetching = false;

  @observable
  isSaving = false;

  @observable
  isLoaded = false;

  model: Class<T>;

  modelName: string;

  rootStore: RootStore;

  actions: Action[] = ["list", "info", "create", "update", "delete", "count"];

  constructor(rootStore: RootStore, model: Class<T>) {
    this.rootStore = rootStore;
    this.model = model;
    this.modelName = modelNameFromClassName(model.name);
  }

  @action
  clear() {
    this.data.clear();
  }

  addPolicies = (policies) => {
    if (policies) {
      policies.forEach((policy) => this.rootStore.policies.add(policy));
    }
  };

  @action
  add = (item: Record<string, any>): T => {
    const Model = this.model;

    if (!(item instanceof Model)) {
      const existing: T | null | undefined = this.data.get(item.id);

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

  save(params: Record<string, any>) {
    if (params.id) return this.update(params);
    return this.create(params);
  }

  get(id: string): T | null | undefined {
    return this.data.get(id);
  }

  @action
  async create(params: Record<string, any>) {
    if (!this.actions.includes("create")) {
      throw new Error(`Cannot create ${this.modelName}`);
    }

    this.isSaving = true;

    try {
      const res = await client.post(`/${this.modelName}s.create`, params);
      invariant(res && res.data, "Data should be available");
      this.addPolicies(res.policies);
      return this.add(res.data);
    } finally {
      this.isSaving = false;
    }
  }

  @action
  async update(params: Record<string, any>): any {
    if (!this.actions.includes("update")) {
      throw new Error(`Cannot update ${this.modelName}`);
    }

    this.isSaving = true;

    try {
      const res = await client.post(`/${this.modelName}s.update`, params);
      invariant(res && res.data, "Data should be available");
      this.addPolicies(res.policies);
      return this.add(res.data);
    } finally {
      this.isSaving = false;
    }
  }

  @action
  async delete(item: T, options: Record<string, any> = {}) {
    if (!this.actions.includes("delete")) {
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
  async fetch(id: string, options: Record<string, any> = {}): Promise<any> {
    if (!this.actions.includes("info")) {
      throw new Error(`Cannot fetch ${this.modelName}`);
    }

    const item = this.data.get(id);
    if (item && !options.force) return item;
    this.isFetching = true;

    try {
      const res = await client.post(`/${this.modelName}s.info`, {
        id,
      });
      invariant(res && res.data, "Data should be available");
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
  fetchPage = async (
    params: PaginationParams | null | undefined
  ): Promise<any> => {
    if (!this.actions.includes("list")) {
      throw new Error(`Cannot list ${this.modelName}`);
    }

    this.isFetching = true;

    try {
      const res = await client.post(`/${this.modelName}s.list`, params);
      invariant(res && res.data, "Data not available");
      runInAction(`list#${this.modelName}`, () => {
        this.addPolicies(res.policies);
        res.data.forEach(this.add);
        this.isLoaded = true;
      });
      const response = res.data;
      response[PAGINATION_SYMBOL] = res.pagination;
      return response;
    } finally {
      this.isFetching = false;
    }
  };

  @computed
  get orderedData(): T[] {
    return orderBy(Array.from(this.data.values()), "createdAt", "desc");
  }
}
