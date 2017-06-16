// @flow
import { observable, action } from 'mobx';

class UiStore {
  @observable activeCollection: ?string;

  /* Actions */

  @action setActiveCollection = (id: string): void => {
    this.activeCollection = id;
  };

  @action clearActiveCollection = (): void => {
    this.activeCollection = null;
  };
}

export default UiStore;
