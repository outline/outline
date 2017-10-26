// @flow
import { EventEmitter } from 'fbemitter';
import _ from 'lodash';

const emitter = new EventEmitter();
window.__emitter = emitter;

class BaseStore {
  emitter: EventEmitter;
  on: (eventName: string, callback: Function) => void;
  emit: (eventName: string, data: any) => void;

  constructor() {
    _.extend(this, emitter);
    this.on = emitter.addListener;
  }
}

export default BaseStore;
