// @flow
import { set, observable } from 'mobx';

export default class BaseModel {
  @observable id: string;
  store: *;

  constructor(fields: Object, store: *) {
    set(this, fields);
    this.store = store;
  }

  save = data => {
    return this.store.save(this, data);
  };

  fetch = async () => {
    return this.store.fetch(this);
  };

  delete = () => {
    return this.store.delete(this);
  };
}
