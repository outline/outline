// @flow
import { observable, action } from 'mobx';

class UiStore {
  @observable activeCollection: ?string;
  @observable editMode: boolean = false;

  /* Actions */

  @action setActiveCollection = (id: string): void => {
    this.activeCollection = id;
  };

  @action clearActiveCollection = (): void => {
    this.activeCollection = null;
  };

  @action enableEditMode() {
    this.editMode = true;
  }

  @action disableEditMode() {
    this.editMode = false;
  }
}

export default UiStore;
