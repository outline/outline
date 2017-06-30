// @flow
import { observable, action, computed } from 'mobx';
import Document from 'models/Document';
import Collection from 'models/Collection';

class UiStore {
  @observable activeDocument: ?Document;
  @observable progressBarVisible: boolean = true;
  @observable editMode: boolean = false;

  /* Computed */

  @computed get activeCollection(): ?Collection {
    return this.activeDocument ? this.activeDocument.collection : undefined;
  }

  /* Actions */

  @action setActiveDocument = (document: Document): void => {
    this.activeDocument = document;
  };

  @action clearActiveDocument = (): void => {
    this.activeDocument = undefined;
  };

  @action enableEditMode() {
    this.editMode = true;
  }

  @action disableEditMode() {
    this.editMode = false;
  }

  @action enableProgressBar() {
    this.progressBarVisible = true;
  }

  @action disableProgressBar() {
    this.progressBarVisible = false;
  }
}

export default UiStore;
