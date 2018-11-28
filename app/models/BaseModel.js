// @flow
import { set, observable } from 'mobx';

export default class BaseModel {
  @observable id: string;
  store: *;

  constructor(fields: Object, store: *) {
    set(this, fields);
    this.store = store;
  }

  save = async params => {
    // ensure that the id is passed if the document has one
    if (params) params = { ...params, id: this.id };
    await this.store.save(params || this.toJS());

    // if saving is successful set the new values on the model itself
    if (params) set(this, params);
    return this;
  };

  fetch = async () => {
    return this.store.fetch(this.id);
  };

  delete = () => {
    return this.store.delete(this);
  };

  toJS = () => {
    return { ...this };
  };
}
