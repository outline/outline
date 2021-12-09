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
    set(this, fields);
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

    if (!fields) {
      throw new Error("Called toJS on a model without @Field decorators");
    }

    return pick(this, fields);
  };

  /**
   * Returns a boolean indicating whether the model has been persisted to db
   *
   * @returns boolean true if the model has never been persisted
   */
  @computed
  get isNew(): boolean {
    return !this.id;
  }

  /**
   * Returns a boolean indicating if the model has changed since it was last saved
   *
   * @returns boolean true if unsaved
   */
  @computed
  get isDirty(): boolean {
    return (
      JSON.stringify(this.persistedAttributes) !== JSON.stringify(this.toJS())
    );
  }

  protected persistedAttributes: Partial<BaseModel> = {};
}
