import { isEqual, pick } from "es-toolkit/compat";
import { observable, action, toJS } from "mobx";
import type { JSONObject } from "@shared/types";
import type Store from "~/stores/base/Store";
import Logger from "~/utils/Logger";
import {
  getFieldForWireKey,
  getFieldsForModel,
  getWireKeyForField,
} from "../decorators/Field";
import { LifecycleManager } from "../decorators/Lifecycle";
import { getRelationsForModelClass } from "../decorators/Relation";
export default abstract class Model {
  static modelName: string;
  @observable
  id: string;
  @observable
  isSaving: boolean;
  @observable
  isNew: boolean;
  @observable
  createdAt: string;
  @observable
  updatedAt: string;
  store: Store<Model>;
  constructor(fields: Record<string, unknown>, store: Store<Model>) {
    this.store = store;
    this.updateData(fields);
    this.isNew = !this.id;
    this.initialized = true;
  }
  /**
   * Ensures all the defined relations and policies for the model are in memory.
   *
   * @returns A promise that resolves when loading is complete.
   */
  async loadRelations(
    this: Model,
    options: {
      withoutPolicies?: boolean;
    } = {}
  ): Promise<unknown> {
    // this is to ensure that multiple loads don’t happen in parallel
    if (this.loadingRelations) {
      return this.loadingRelations;
    }
    const promises = [];
    const relations = getRelationsForModelClass(
      this.constructor as typeof Model
    );
    if (relations) {
      for (const properties of relations.values()) {
        const store = this.store.rootStore.getStoreForModelName(
          properties.relationClassResolver().modelName
        );
        if ("canFetchById" in store && store.canFetchById) {
          const id = this[properties.idKey];
          if (id) {
            promises.push(store.fetch(id as string));
          }
        }
      }
    }
    const policy = this.store.rootStore.policies.get(this.id);
    if (!policy && !options.withoutPolicies && this.store.canFetchById) {
      promises.push(this.store.fetch(this.id, { force: true }));
    }
    try {
      this.loadingRelations = Promise.all(promises);
      return await this.loadingRelations;
    } finally {
      this.loadingRelations = undefined;
    }
  }
  /**
   * Persists the model to the server API
   *
   * Explicit parameters are serialized using their registered wire-key aliases.
   *
   * @param params Specific fields to save, if not provided the model will be serialized
   * @param options Options to pass to the store
   * @returns A promise that resolves with the updated model
   */
  save = async (
    params?: Record<string, unknown>,
    options?: Record<string, string | boolean | number | undefined>
  ): Promise<Model> => {
    const isNew = this.isNew;
    this.isSaving = true;
    try {
      // ensure that the id is passed if the document has one
      const apiParams = params
        ? Object.fromEntries(
            Object.entries(params).map(([key, value]) => [
              getWireKeyForField(this, key) ?? key,
              value,
            ])
          )
        : this.toAPI();
      if (isNew) {
        LifecycleManager.executeHooks(this.constructor, "beforeCreate", this);
      } else {
        LifecycleManager.executeHooks(this.constructor, "beforeUpdate", this);
      }
      const model = await this.store.save(
        {
          ...apiParams,
          id: this.id,
        },
        {
          ...options,
          isNew,
        }
      );
      // if saving is successful set the new values on the model itself
      this.updateData(Object.assign({}, params, model));
      if (isNew) {
        LifecycleManager.executeHooks(this.constructor, "afterCreate", this);
      } else {
        LifecycleManager.executeHooks(this.constructor, "afterUpdate", this);
      }
      return model;
    } finally {
      this.isSaving = false;
    }
  };
  updateData = action((data: Record<string, unknown>) => {
    if (this.initialized) {
      LifecycleManager.executeHooks(this.constructor, "beforeChange", this);
    }
    const previousAttributes = this.toAPI({ includeWireAliases: false });
    // Some properties are aliased to a different key in the server's JSON
    // (see Field's wire-key alias form) — remap those keys onto the
    // property name first, so the loop below populates the property the
    // rest of the app actually reads rather than a stray same-named key.
    const remapped: Record<string, unknown> = {};
    for (const key in data) {
      const propertyKey = getFieldForWireKey(this, key);
      remapped[propertyKey ? String(propertyKey) : key] = data[key];
    }
    for (const key in remapped) {
      try {
        // Some models are serialized with the initialized flag, this should be ignored.
        if (key === "initialized") {
          continue;
        }
        // @ts-expect-error TODO
        if (isEqual(toJS(this[key]), remapped[key])) {
          continue;
        }
        // @ts-expect-error TODO
        this[key] = remapped[key];
      } catch (error) {
        Logger.warn(`Error setting ${key} on model`, { error });
      }
    }
    this.isNew = false;
    this.persistedAttributes = this.toAPI();
    if (this.initialized) {
      LifecycleManager.executeHooks(
        this.constructor,
        "afterChange",
        this,
        previousAttributes
      );
    }
  });
  fetch = (options?: JSONObject) => this.store.fetch(this.id, options);
  refresh = () =>
    this.fetch({
      force: true,
    });
  delete = async () => {
    this.isSaving = true;
    try {
      LifecycleManager.executeHooks(this.constructor, "beforeDelete", this);
      const response = await this.store.delete(this);
      LifecycleManager.executeHooks(this.constructor, "afterDelete", this);
      return response;
    } finally {
      this.isSaving = false;
    }
  };
  /**
   * Returns a plain object representation of fields on the model for
   * persistence to the server API.
   *
   * By default, any property with a registered wire-key alias (see
   * `@Field(wireKey)`) is remapped onto that wire key, since this is the
   * shape the server's JSON expects. Pass `includeWireAliases: false` to get
   * the plain, unaliased shape instead — keyed by local property name — which
   * is what internal snapshots (e.g. `previousAttributes` for `@AfterChange`
   * hooks) must use, since consumers of those snapshots read them by the
   * model's own property names, not the server's wire names.
   *
   * @param options.includeWireAliases whether to remap aliased fields onto
   * their wire keys. Defaults to true.
   * @returns A plain object representation of the model.
   */
  toAPI = ({
    includeWireAliases = true,
  }: {
    includeWireAliases?: boolean;
  } = {}): Partial<Model> => {
    const fieldKeys = getFieldsForModel(this);
    const picked = pick(this, fieldKeys) as Record<string, unknown>;
    if (!includeWireAliases) {
      return picked as Partial<Model>;
    }
    const hasAliases = fieldKeys.some((key) => getWireKeyForField(this, key));
    if (!hasAliases) {
      return picked as Partial<Model>;
    }
    const remapped: Record<string, unknown> = {};
    for (const key of Object.keys(picked)) {
      const wireKey = getWireKeyForField(this, key) ?? key;
      remapped[wireKey] = picked[key];
    }
    return remapped as Partial<Model>;
  };
  /**
   * Returns a plain object representation of all the properties on the model
   * overrides the native toJSON method to avoid attempting to serialize store
   *
   * @returns A plain object representation of the model
   */
  toJSON() {
    const output: Partial<typeof this> = {};
    for (const property in this) {
      if (
        // oxlint-disable-next-line no-prototype-builtins
        this.hasOwnProperty(property) &&
        !["persistedAttributes", "store", "isSaving", "isNew"].includes(
          property
        )
      ) {
        output[property] = this[property];
      }
    }
    return output;
  }
  /**
   * Returns a boolean indicating if the model has changed since it was last
   * persisted to the server
   *
   * @returns boolean true if unsaved
   */
  isDirty(): boolean {
    const attributes = this.toAPI();
    if (Object.keys(attributes).length === 0) {
      Logger.warn("Checking dirty on model with no @Field decorators");
    }
    return (
      JSON.stringify(this.persistedAttributes) !== JSON.stringify(attributes)
    );
  }
  protected persistedAttributes: Partial<Model> = {};
  /** A promise that resolves when all relations have been loaded. */
  private loadingRelations: Promise<unknown[]> | undefined;
  /** A boolean representing if the constructor has been called. */
  private initialized = false;
}
