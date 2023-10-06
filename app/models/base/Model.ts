import pick from "lodash/pick";
import { set, observable, action } from "mobx";
import type Store from "~/stores/base/Store";
import Logger from "~/utils/Logger";
import { getFieldsForModel } from "../decorators/Field";

export default abstract class Model {
  @observable
  id: string;

  @observable
  isSaving: boolean;

  @observable
  isNew: boolean;

  createdAt: string;

  @observable
  updatedAt: string;

  store: Store<Model>;

  constructor(fields: Record<string, any>, store: Store<Model>) {
    this.store = store;
    this.updateData(fields);
    this.isNew = !this.id;
  }

  save = async (
    params?: Record<string, any>,
    options?: Record<string, string | boolean | number | undefined>
  ) => {
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

  updateData = action((data: any) => {
    for (const key in data) {
      this[key] = data[key];
    }

    this.isNew = false;
    this.persistedAttributes = this.toAPI();
  });

  fetch = (options?: any) => this.store.fetch(this.id, options);

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
   * @returns {Record<string, any>}
   */
  toAPI = (): Record<string, any> => {
    const fields = getFieldsForModel(this);
    return pick(this, fields);
  };

  /**
   * Returns a plain object representation of all the properties on the model
   * overrides the native toJSON method to avoid attempting to serialize store
   *
   * @returns {Record<string, any>}
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
}
