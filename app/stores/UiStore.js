// @flow
import { observable, action } from 'mobx';
import Document from 'models/Document';
import Collection from 'models/Collection';
import type { Toast } from '../types';

class UiStore {
  @observable activeModalName: ?string;
  @observable activeModalProps: ?Object;
  @observable activeDocumentId: ?string;
  @observable activeCollectionId: ?string;
  @observable progressBarVisible: boolean = false;
  @observable editMode: boolean = false;
  @observable mobileSidebarVisible: boolean = false;
  @observable toasts: Toast[] = [];

  @action
  setActiveModal = (name: string, props: ?Object): void => {
    this.activeModalName = name;
    this.activeModalProps = props;
  };

  @action
  clearActiveModal = (): void => {
    this.activeModalName = undefined;
    this.activeModalProps = undefined;
  };

  @action
  setActiveDocument = (document: Document): void => {
    this.activeDocumentId = document.id;

    if (document.publishedAt) {
      this.activeCollectionId = document.collectionId;
    }
  };

  @action
  setActiveCollection = (collection: Collection): void => {
    this.activeCollectionId = collection.id;
  };

  @action
  clearActiveCollection = (): void => {
    this.activeCollectionId = undefined;
  };

  @action
  clearActiveDocument = (): void => {
    this.activeDocumentId = undefined;
    this.activeCollectionId = undefined;
  };

  @action
  enableEditMode() {
    this.editMode = true;
  }

  @action
  disableEditMode() {
    this.editMode = false;
  }

  @action
  enableProgressBar() {
    this.progressBarVisible = true;
  }

  @action
  disableProgressBar() {
    this.progressBarVisible = false;
  }

  @action
  toggleMobileSidebar() {
    this.mobileSidebarVisible = !this.mobileSidebarVisible;
  }

  @action
  hideMobileSidebar() {
    this.mobileSidebarVisible = false;
  }

  @action
  showToast = (
    message: string,
    type?: 'warning' | 'error' | 'info' | 'success' = 'success'
  ): void => {
    this.toasts.push({ message, type });
  };

  @action
  removeToast = (index: number): void => {
    this.toasts.splice(index, 1);
  };
}

export default UiStore;
