import { pick } from "lodash";
import { set, computed, observable } from "mobx";
import { getFieldsForModel } from "./decorators/Field";

export default class BaseModel {
  @observable
  id: string;

  @observable
  isSaving: boolean;

  store: any;

  constructor(fields: Record<string, any>, store: any) {
    this.updateFromJson(fields);
    this.store = store;
  }

  save = async (params?: Record<string, any>) => {
    this.isSaving = true;

    try {
      // ensure that the id is passed if the document has one
      if (params) {
        params = { ...params, id: this.id };
      }

      const model = await this.store.save(params || this.toJS());

      // if saving is successful set the new values on the model itself
      set(this, { ...params, ...model });

      this.persistedAttributes = this.toJS();

      return model;
    } finally {
      this.isSaving = false;
    }
  };

  updateFromJson = (data: any) => {
    set(this, data);
    this.persistedAttributes = this.toJS();
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
   * Returns a plain object representation of the model
   *
   * @returns {Record<string, any>}
   */
  toJS = (): Record<string, any> => {
    const fields = getFieldsForModel(this);
    return pick(this, fields) || [];
  };

  /**
   * Returns a boolean indicating if the model has changed since it was last
   * persisted to the server
   *
   * @returns boolean true if unsaved
   */
  isDirty(): boolean {
    const attributes = this.toJS();

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
