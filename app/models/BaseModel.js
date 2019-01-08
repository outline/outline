// @flow
import { set, observable } from 'mobx';

export default class BaseModel {
  @observable id: string;
  @observable isSaving: boolean;
  store: *;

  constructor(fields: Object, store: *) {
    set(this, fields);
    this.store = store;
  }

  save = async params => {
    this.isSaving = true;

    try {
      // ensure that the id is passed if the document has one
      if (params) params = { ...params, id: this.id };
      const model = await this.store.save(params || this.toJS());

      // if saving is successful set the new values on the model itself
      set(this, { ...params, ...model });
      return model;
    } finally {
      this.isSaving = false;
    }
  };

  fetch = (options: *) => {
    return this.store.fetch(this.id, options);
  };

  refresh = () => {
    return this.fetch({ force: true });
  };

  delete = async () => {
    this.isSaving = true;
    try {
      return await this.store.delete(this);
    } finally {
      this.isSaving = false;
    }
  };

  toJS = () => {
    return { ...this };
  };
}
