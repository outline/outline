import { isEqual, pick } from "es-toolkit/compat";
import { observable, action, runInAction, toJS } from "mobx";
import type { JSONObject } from "@shared/types";
import type Store from "~/stores/base/Store";
import Logger from "~/utils/Logger";
import { getFieldsForModel } from "../decorators/Field";
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
    options: { withoutPolicies?: boolean } = {}
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
        if ("fetch" in store) {
          const id = this[properties.idKey];
          if (id) {
            promises.push(store.fetch(id as string));
          }
        }
      }
    }

    const policy = this.store.rootStore.policies.get(this.id);
    if (!policy && !options.withoutPolicies) {
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
   * Persists the model to the server API.
   *
   * The change is applied optimistically – the given params are set on the
   * model immediately so that observers of the store update without waiting
   * for the server to respond, and are rolled back if the request fails.
   *
   * @param params Specific fields to save, if not provided the model will be serialized
   * @param options Options to pass to the store
   * @returns A promise that resolves with the updated model
   * @throws The original error if the request fails, after the model has been rolled back.
   */
  save = async (
    params?: Record<string, unknown>,
    options?: Record<string, string | boolean | number | undefined>
  ): Promise<Model> => {
    const isNew = this.isNew;
    this.isSaving = true;

    // ensure that the id is passed if the document has one
    const data: Record<string, unknown> = params ?? this.toAPI();

    // Snapshot the current state of the model so that the optimistic update
    // below can be rolled back if saving fails.
    const previousAttributes = this.persistedAttributes;
    const previousValues: Record<string, unknown> = {};
    for (const key in data) {
      // @ts-expect-error TODO
      previousValues[key] = toJS(this[key]);
    }
    const previousId = this.id;
    let addedToStore = false;

    try {
      if (isNew) {
        LifecycleManager.executeHooks(this.constructor, "beforeCreate", this);
      } else {
        LifecycleManager.executeHooks(this.constructor, "beforeUpdate", this);
      }

      // Optimistically apply the new values so that observers of the store
      // update immediately, without waiting for the server to respond.
      runInAction(() => {
        this.updateData(data);
        // Keep the attributes last received from the server so that `isDirty`
        // stays accurate while the request is in flight.
        this.persistedAttributes = previousAttributes;

        if (isNew && this.id && !this.store.get(this.id)) {
          this.store.add(this);
          addedToStore = true;
        }
      });

      const model = await this.store.save(
        {
          ...data,
          id: previousId,
        },
        {
          ...options,
          isNew,
        }
      );

      // if saving is successful set the new values on the model itself
      this.updateData(Object.assign({}, data, model));

      // if the server responded with a different model to the one added
      // optimistically then remove the temporary entry from the store
      if (addedToStore && model !== this) {
        runInAction(() => {
          if (this.store.get(previousId) === this) {
            this.store.data.delete(previousId);
          }
        });
      }

      if (isNew) {
        LifecycleManager.executeHooks(this.constructor, "afterCreate", this);
      } else {
        LifecycleManager.executeHooks(this.constructor, "afterUpdate", this);
      }

      return model;
    } catch (err) {
      // roll the model back to its state before saving began
      runInAction(() => {
        this.updateData(previousValues);
        this.persistedAttributes = previousAttributes;
        this.isNew = isNew;

        if (addedToStore && this.store.get(previousId) === this) {
          this.store.data.delete(previousId);
        }
      });
      throw err;
    } finally {
      this.isSaving = false;
    }
  };

  updateData = action((data: Record<string, unknown>) => {
    if (this.initialized) {
      LifecycleManager.executeHooks(this.constructor, "beforeChange", this);
    }

    const previousAttributes = this.toAPI();

    for (const key in data) {
      try {
        // Some models are serialized with the initialized flag, this should be ignored.
        if (key === "initialized") {
          continue;
        }
        // @ts-expect-error TODO
        if (isEqual(toJS(this[key]), data[key])) {
          continue;
        }
        // @ts-expect-error TODO
        this[key] = data[key];
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
   * persistence to the server API
   *
   * @returns A plain object representation of the model
   */
  toAPI = (): Partial<Model> => {
    const fields = getFieldsForModel(this);
    return pick(this, fields);
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
