import { pick } from "lodash";
import { set, computed, observable } from "mobx";
import { getFieldsForModel } from "./decorators/Field";

export default abstract class BaseModel {
  @observable
  id: string;

  @observable
  isSaving: boolean;

  createdAt: string;

  updatedAt: string;

  store: any;

  constructor(fields: Record<string, any>, store: any) {
    this.updateFromJson(fields);
    this.store = store;
  }

  save = async (params?: Record<string, any>) => {
    this.isSaving = true;

    try {
      // ensure that the id is passed if the document has one
      if (!params) {
        params = this.toAPI();
      }

      const model = await this.store.save({ ...params, id: this.id });

      // if saving is successful set the new values on the model itself
      set(this, { ...params, ...model });

      this.persistedAttributes = this.toAPI();

      return model;
    } finally {
      this.isSaving = false;
    }
  };

  updateFromJson = (data: any) => {
    set(this, data);
    this.persistedAttributes = this.toAPI();
  };

  fetch = (options?: any) => {
    return this.store.fetch(this.id, options);
  };

  refresh = () => {
    return this.fetch({
      force: true,
    });
  };

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
    return pick(this, fields) || [];
  };

  /**
   * Returns a plain object representation of all the properties on the model
   * overrides the inbuilt toJSON method to avoid attempting to serialize store
   *
   * @returns {Record<string, any>}
   */
  toJSON() {
    const output: Partial<typeof this> = {};

    for (const property in this) {
      if (
        // eslint-disable-next-line no-prototype-builtins
        this.hasOwnProperty(property) &&
        !["persistedAttributes", "store", "isSaving"].includes(property)
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
      console.warn("Checking dirty on model with no @Field decorators");
    }

    return (
      JSON.stringify(this.persistedAttributes) !== JSON.stringify(attributes)
    );
  }

  /**
   * Returns a boolean indicating whether the model has been persisted to db
   *
   * @returns boolean true if the model has never been persisted
   */
  @computed
  get isNew(): boolean {
    return !this.id;
  }

  protected persistedAttributes: Partial<BaseModel> = {};
}
