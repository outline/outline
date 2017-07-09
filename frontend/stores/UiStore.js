// @flow
import { observable, action, computed } from 'mobx';
import Document from 'models/Document';
import Collection from 'models/Collection';
import modals from 'components/modals';

class UiStore {
  @observable activeDocument: ?Document;
  @observable progressBarVisible: boolean = false;
  @observable editMode: boolean = false;
  @observable modalName: ?string;
  @observable modalProps: ?Object;

  /* Computed */

  @computed get activeCollection(): ?Collection {
    return this.activeDocument ? this.activeDocument.collection : undefined;
  }

  @computed get modalComponent(): ?ReactClass<any> {
    if (this.modalName) return modals[this.modalName];
  }

  /* Actions */

  @action setActiveDocument = (document: Document): void => {
    this.activeDocument = document;
  };

  @action clearActiveDocument = (): void => {
    this.activeDocument = undefined;
  };

  @action openModal = (name: string, props?: Object) => {
    this.modalName = name;
    this.modalProps = props;
  };

  @action closeModal = () => {
    this.modalName = undefined;
    this.modalProps = undefined;
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
