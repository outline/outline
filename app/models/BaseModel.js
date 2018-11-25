// @flow
import { extendObservable } from 'mobx';
export default class BaseModel {
  id: string;
  store: *;

  constructor(fields: Object, store: *) {
    extendObservable(this, fields);
    this.store = store;
  }
}
