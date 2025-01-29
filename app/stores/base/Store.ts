import commandScore from "command-score";
import invariant from "invariant";
import { deburr, type ObjectIterateeCustom } from "lodash";
import filter from "lodash/filter";
import find from "lodash/find";
import flatten from "lodash/flatten";
import lowerFirst from "lodash/lowerFirst";
import orderBy from "lodash/orderBy";
import { observable, action, computed, runInAction } from "mobx";
import pluralize from "pluralize";
import { Pagination } from "@shared/constants";
import { type JSONObject } from "@shared/types";
import RootStore from "~/stores/RootStore";
import Policy from "~/models/Policy";
import ArchivableModel from "~/models/base/ArchivableModel";
import Model from "~/models/base/Model";
import { LifecycleManager } from "~/models/decorators/Lifecycle";
import { getInverseRelationsForModelClass } from "~/models/decorators/Relation";
import { Searchable } from "~/models/interfaces/Searchable";
import type { PaginationParams, PartialExcept, Properties } from "~/types";
import { client } from "~/utils/ApiClient";
import { AuthorizationError, NotFoundError } from "~/utils/errors";

export enum RPCAction {
  Info = "info",
  List = "list",
  Create = "create",
  Update = "update",
  Delete = "delete",
  Count = "count",
}

export const PAGINATION_SYMBOL = Symbol.for("pagination");

export type PaginatedResponse<T> = T[] & {
  [PAGINATION_SYMBOL]?: {
    total: number;
    limit: number;
    offset: number;
    nextPath: string;
  };
};

export type FetchPageParams = PaginationParams & Record<string, any>;

export default abstract class Store<T extends Model> {
  @observable
  data: Map<string, T> = new Map();

  @observable
  isFetching = false;

  @observable
  isSaving = false;

  @observable
  isLoaded = false;

  requests: Map<string, Promise<any>> = new Map();

  model: typeof Model;

  modelName: string;

  apiEndpoint: string;

  rootStore: RootStore;

  actions = [
    RPCAction.Info,
    RPCAction.List,
    RPCAction.Create,
    RPCAction.Update,
    RPCAction.Delete,
  ];

  constructor(rootStore: RootStore, model: typeof Model) {
    this.rootStore = rootStore;
    this.model = model;
    this.modelName = model.modelName;

    if (!this.apiEndpoint) {
      this.apiEndpoint = pluralize(lowerFirst(model.modelName));
    }
  }

  @action
  clear() {
    this.data.clear();
  }

  addPolicies = (policies: Policy[]) => {
    policies?.forEach((policy) => this.rootStore.policies.add(policy));
  };

  findByQuery = (query: string, options?: { maxResults: number }): T[] => {
    const normalized = deburr((query ?? "").trim().toLocaleLowerCase());

    if (!normalized) {
      return this.orderedData.slice(0, options?.maxResults);
    }

    return this.orderedData
      .filter((item: T & Searchable) => {
        if ("searchContent" in item) {
          const seachables =
            typeof item.searchContent === "string"
              ? [item.searchContent]
              : item.searchContent;
          return seachables.some((searchable) =>
            deburr(searchable.toLocaleLowerCase()).includes(normalized)
          );
        }

        throw new Error("Item does not implement Searchable interface");
      })
      .map((item: T & Searchable) => {
        const seachables =
          typeof item.searchContent === "string"
            ? [item.searchContent]
            : item.searchContent;

        return {
          score:
            seachables
              .map((searchable) => commandScore(normalized, searchable))
              .reduce((a, b) => a + b, 0) / seachables.length,
          item,
        };
      })
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item)
      .slice(0, options?.maxResults);
  };

  @action
  add = (item: PartialExcept<T, "id"> | T): T => {
    const ModelClass = this.model;

    if (!(item instanceof ModelClass)) {
      const existingModel = this.data.get(item.id);

      if (existingModel) {
        existingModel.updateData(item);
        return existingModel;
      }

      // @ts-expect-error TS thinks that we're instantiating an abstract class here
      const newModel = new ModelClass(item, this);
      this.data.set(newModel.id, newModel);
      return newModel;
    }

    this.data.set(item.id, item);
    return item;
  };

  @action
  remove(id: string): void {
    const model = this.data.get(id);
    if (!model) {
      return;
    }

    const inverseRelations = getInverseRelationsForModelClass(this.model);

    inverseRelations.forEach((relation) => {
      const store = this.rootStore.getStoreForModelName(relation.modelName);
      if ("orderedData" in store) {
        const items = (store.orderedData as Model[]).filter(
          (item) => item[relation.idKey] === id
        );

        items.forEach((item) => {
          let deleteBehavior = relation.options.onDelete;

          if (typeof relation.options.onDelete === "function") {
            deleteBehavior = relation.options.onDelete(item);
          }

          if (deleteBehavior === "cascade") {
            store.remove(item.id);
          } else if (deleteBehavior === "null") {
            // @ts-expect-error TODO
            item[relation.idKey] = null;
          }
        });
      }
    });

    // Remove associated policies automatically, not defined through Relation decorator.
    if (this.modelName !== "Policy") {
      this.rootStore.policies.remove(id);
    }

    LifecycleManager.executeHooks(model.constructor, "beforeRemove", model);
    this.data.delete(id);
    LifecycleManager.executeHooks(model.constructor, "afterRemove", model);
  }

  @action
  addToArchive(item: ArchivableModel): void {
    const inverseRelations = getInverseRelationsForModelClass(this.model);

    inverseRelations.forEach((relation) => {
      const store = this.rootStore.getStoreForModelName(relation.modelName);
      if ("orderedData" in store) {
        const items = (store.orderedData as ArchivableModel[]).filter(
          (data) => data[relation.idKey] === item.id
        );

        items.forEach((item) => {
          let archiveBehavior = relation.options.onArchive;

          if (typeof relation.options.onArchive === "function") {
            archiveBehavior = relation.options.onArchive(item);
          }

          if (archiveBehavior === "cascade") {
            store.addToArchive(item);
          } else if (archiveBehavior === "null") {
            // @ts-expect-error TODO
            item[relation.idKey] = null;
          }
        });
      }
    });

    // Remove associated policies automatically, not defined through Relation decorator.
    if (this.modelName !== "Policy") {
      this.rootStore.policies.remove(item.id);
    }

    item.archivedAt = new Date().toISOString();
    (this as unknown as Store<ArchivableModel>).add(item);
  }

  /**
   * Remove all items in the store that match the predicate.
   *
   * @param predicate A function that returns true if the item matches, or an object with the properties to match.
   */
  removeAll = (predicate: Parameters<typeof this.filter>[0]) => {
    this.filter(predicate).forEach((item) => this.remove(item.id));
  };

  save(params: Properties<T>, options: JSONObject = {}): Promise<T> {
    const { isNew, ...rest } = options;
    if (isNew || !("id" in params) || !params.id) {
      return this.create(params, rest);
    }
    return this.update(params, rest);
  }

  /**
   * Get a single item from the store that matches the ID.
   *
   * @param id The ID of the item to get.
   */
  get(id: string): T | undefined {
    return this.data.get(id);
  }

  @action
  async create(params: Properties<T>, options?: JSONObject): Promise<T> {
    if (!this.actions.includes(RPCAction.Create)) {
      throw new Error(`Cannot create ${this.modelName}`);
    }

    this.isSaving = true;

    try {
      const res = await client.post(`/${this.apiEndpoint}.create`, {
        ...params,
        ...options,
      });

      return runInAction(`create#${this.modelName}`, () => {
        invariant(res?.data, "Data should be available");
        this.addPolicies(res.policies);
        return this.add(res.data);
      });
    } finally {
      this.isSaving = false;
    }
  }

  @action
  async update(params: Properties<T>, options?: JSONObject): Promise<T> {
    if (!this.actions.includes(RPCAction.Update)) {
      throw new Error(`Cannot update ${this.modelName}`);
    }

    this.isSaving = true;

    try {
      const res = await client.post(`/${this.apiEndpoint}.update`, {
        ...params,
        ...options,
      });

      return runInAction(`update#${this.modelName}`, () => {
        invariant(res?.data, "Data should be available");
        this.addPolicies(res.policies);
        return this.add(res.data);
      });
    } finally {
      this.isSaving = false;
    }
  }

  @action
  async delete(item: T, options: JSONObject = {}) {
    if (!this.actions.includes(RPCAction.Delete)) {
      throw new Error(`Cannot delete ${this.modelName}`);
    }

    if (item.isNew) {
      return this.remove(item.id);
    }

    this.isSaving = true;

    try {
      await client.post(`/${this.apiEndpoint}.delete`, {
        id: item.id,
        ...options,
      });
      return this.remove(item.id);
    } finally {
      this.isSaving = false;
    }
  }

  @action
  async fetch(
    id: string,
    options: JSONObject = {},
    accessor = (res: unknown) => (res as { data: PartialExcept<T, "id"> }).data
  ): Promise<T> {
    if (!this.actions.includes(RPCAction.Info)) {
      throw new Error(`Cannot fetch ${this.modelName}`);
    }

    const item = this.get(id);
    if (item && !options.force) {
      return item;
    }

    if (this.requests.has(id)) {
      return this.requests.get(id);
    }

    this.isFetching = true;

    const promise = new Promise<T>((resolve, reject) => {
      client
        .post(`/${this.apiEndpoint}.info`, {
          id,
        })
        .then((res) =>
          runInAction(`info#${this.modelName}`, () => {
            invariant(res?.data, "Data should be available");
            this.addPolicies(res.policies);
            resolve(this.add(accessor(res)));
          })
        )
        .catch((err) => {
          if (
            err instanceof AuthorizationError ||
            err instanceof NotFoundError
          ) {
            this.remove(id);
          }

          reject(err);
        })
        .finally(() => {
          this.requests.delete(id);
          this.isFetching = false;
        });
    });

    this.requests.set(id, promise);
    return promise;
  }

  @action
  fetchPage = async (
    params?: FetchPageParams | undefined
  ): Promise<PaginatedResponse<T>> => {
    if (!this.actions.includes(RPCAction.List)) {
      throw new Error(`Cannot list ${this.modelName}`);
    }

    this.isFetching = true;

    try {
      const res = await client.post(`/${this.apiEndpoint}.list`, params);
      invariant(res?.data, "Data not available");

      let response: PaginatedResponse<T> = [];

      runInAction(`list#${this.modelName}`, () => {
        this.addPolicies(res.policies);
        response = res.data.map(this.add);
        this.isLoaded = true;
      });

      response[PAGINATION_SYMBOL] = res.pagination;
      return response;
    } finally {
      this.isFetching = false;
    }
  };

  @action
  fetchAll = async (
    params?: Record<string, any>
  ): Promise<PaginatedResponse<T>> => {
    const limit = params?.limit ?? Pagination.defaultLimit;
    const response = await this.fetchPage({ ...params, limit });

    invariant(
      response[PAGINATION_SYMBOL],
      "Pagination information not available in response"
    );

    const pages = Math.ceil(response[PAGINATION_SYMBOL].total / limit);
    const fetchPages = [];
    for (let page = 1; page < pages; page++) {
      fetchPages.push(
        this.fetchPage({ ...params, offset: page * limit, limit })
      );
    }

    const results = flatten([
      response,
      ...(fetchPages.length ? await Promise.all(fetchPages) : []),
    ]);

    if (params?.withRelations) {
      await Promise.all(
        this.orderedData.map((integration) => integration.loadRelations())
      );
    }

    return results;
  };

  @computed
  get orderedData(): T[] {
    return orderBy(Array.from(this.data.values()), "createdAt", "desc");
  }

  /**
   * Find an item in the store matching the given predicate.
   *
   * @param predicate A function that returns true if the item matches, or an object with the properties to match.
   */
  find = (predicate: ObjectIterateeCustom<T, boolean>): T | undefined =>
    // @ts-expect-error not sure why T is incompatible
    find(this.orderedData, predicate);

  /**
   * Filter items in the store matching the given predicate.
   *
   * @param predicate A function that returns true if the item matches, or an object with the properties to match.
   */
  filter = (predicate: ObjectIterateeCustom<T, boolean>): T[] =>
    // @ts-expect-error not sure why T is incompatible
    filter(this.orderedData, predicate);
}
