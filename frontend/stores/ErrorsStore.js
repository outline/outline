// @flow
import { observable, action } from 'mobx';

class UiStore {
  @observable errors = observable.array([]);

  /* Actions */

  @action add = (errorMessage: string): void => {
    this.errors.push(errorMessage);
  };

  @action remove = (index: number): void => {
    this.errors.splice(index, 1);
  };
}

export default UiStore;
