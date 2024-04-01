import pick from "lodash/pick";
import { set, observable, action } from "mobx";
import { JSONObject } from "@shared/types";
import type Store from "~/stores/base/Store";
import Logger from "~/utils/Logger";
import { getFieldsForModel } from "../decorators/Field";
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

  constructor(fields: Record<string, any>, store: Store<Model>) {
    this.store = store;
    this.updateData(fields);
    this.isNew = !this.id;
  }

  /**
   * Ensures all the defined relations and policies for the model are in memory.
   *
   * @returns A promise that resolves when loading is complete.
   */
  async loadRelations(): Promise<any> {
    const relations = getRelationsForModelClass(
      this.constructor as typeof Model
    );
    if (!relations) {
      return;
    }
    // this is to ensure that multiple loads don’t happen in parallel
    if (this.loadingRelations) {
      return this.loadingRelations;
    }

    const promises = [];

    for (const properties of relations.values()) {
      const store = this.store.rootStore.getStoreForModelName(
        properties.relationClassResolver().modelName
      );
      if ("fetch" in store) {
        promises.push(store.fetch(this[properties.idKey]));
      }
    }

    const policy = this.store.rootStore.policies.get(this.id);
    if (!policy) {
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
   * @param params Specific fields to save, if not provided the model will be serialized
   * @param options Options to pass to the store
   * @returns A promise that resolves with the updated model
   */
  save = async (
    params?: Record<string, any>,
    options?: Record<string, string | boolean | number | undefined>
  ): Promise<Model> => {
    this.isSaving = true;

    try {
      // ensure that the id is passed if the document has one
      if (!params) {
        params = this.toAPI();
      }

      const model = await this.store.save(
        {
          ...params,
          id: this.id,
        },
        {
          ...options,
          isNew: this.isNew,
        }
      );

      // if saving is successful set the new values on the model itself
      set(this, { ...params, ...model, isNew: false });

      this.persistedAttributes = this.toAPI();

      return model;
    } finally {
      this.isSaving = false;
    }
  };

  updateData = action((data: Partial<Model>) => {
    for (const key in data) {
      try {
        this[key] = data[key];
      } catch (error) {
        Logger.warn(`Error setting ${key} on model`, error);
      }
    }

    this.isNew = false;
    this.persistedAttributes = this.toAPI();
  });

  fetch = (options?: JSONObject) => this.store.fetch(this.id, options);

  refresh = () =>
    this.fetch({
      force: true,
    });

  delete = async () => {
    this.isSaving = true;

    try {
      return await this.store.delete(this);
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
  toAPI = (): Record<string, any> => {
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
        // eslint-disable-next-line no-prototype-builtins
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

  /**
   * A promise that resolves when all relations have been loaded
   */
  private loadingRelations: Promise<any[]> | undefined;
}
