// @flow
import { observable, action } from 'mobx';
import Document from 'models/Document';

class UiStore {
  @observable activeDocumentId: ?string;
  @observable activeCollectionId: ?string;
  @observable progressBarVisible: boolean = false;
  @observable editMode: boolean = false;

  /* Actions */

  @action setActiveDocument = (document: Document): void => {
    this.activeDocumentId = document.id;
    this.activeCollectionId = document.collection.id;
  };

  @action clearActiveDocument = (): void => {
    this.activeDocumentId = undefined;
    this.activeCollectionId = undefined;
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
