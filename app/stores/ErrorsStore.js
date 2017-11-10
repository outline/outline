// @flow
import { observable, action } from 'mobx';

class ErrorsStore {
  @observable data = observable.array([]);

  /* Actions */

  @action
  add = (message: string): void => {
    this.data.push(message);
  };

  @action
  remove = (index: number): void => {
    this.data.splice(index, 1);
  };
}

export default ErrorsStore;
