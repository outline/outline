// @flow
import { extendObservable } from 'mobx';
import { EventEmitter } from 'fbemitter';
class BaseModel extends EventEmitter {
  id: string;
  store: *;

  constructor(fields: Object, store: *) {
    super();
    extendObservable(this, fields);
    this.on = this.addListener;
    this.store = store;
  }
}

export default BaseModel;
