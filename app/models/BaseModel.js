// @flow
import { set, observable } from 'mobx';

export default class BaseModel {
  @observable id: string;
  store: *;

  constructor(fields: Object, store: *) {
    set(this, fields);
    this.store = store;
  }

  save = params => {
    return this.store.save(params || this.toJS());
  };

  fetch = async () => {
    return this.store.fetch(this);
  };

  delete = () => {
    return this.store.delete(this);
  };

  toJS = () => {
    return { ...this };
  };
}
