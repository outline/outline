// @flow
import { observable, action } from 'mobx';

class ErrorsStore {
  @observable errors = observable.array([]);

  /* Actions */

  @action add = (message: string): void => {
    this.errors.push(message);
  };

  @action remove = (index: number): void => {
    this.errors.splice(index, 1);
  };
}

export default ErrorsStore;
