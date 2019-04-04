// @flow
import { v4 } from 'uuid';
import { orderBy } from 'lodash';
import { observable, action, computed } from 'mobx';
import Document from 'models/Document';
import Collection from 'models/Collection';
import type { Toast } from '../types';

class UiStore {
  @observable
  theme: 'light' | 'dark' = window.localStorage.getItem('theme') || 'light';
  @observable activeModalName: ?string;
  @observable activeModalProps: ?Object;
  @observable activeDocumentId: ?string;
  @observable activeCollectionId: ?string;
  @observable progressBarVisible: boolean = false;
  @observable editMode: boolean = false;
  @observable mobileSidebarVisible: boolean = false;
  @observable toasts: Map<string, Toast> = new Map();

  @action
  toggleDarkMode = () => {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    window.localStorage.setItem('theme', this.theme);
  };

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

    if (document.publishedAt && !document.isArchived && !document.isDeleted) {
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
  ) => {
    if (!message) return;

    const id = v4();
    const createdAt = new Date().toISOString();
    this.toasts.set(id, { message, type, createdAt, id });
    return id;
  };

  @action
  removeToast = (id: string) => {
    this.toasts.delete(id);
  };

  @computed
  get orderedToasts(): Toast[] {
    // $FlowIssue
    return orderBy(Array.from(this.toasts.values()), 'createdAt', 'desc');
  }
}

export default UiStore;
