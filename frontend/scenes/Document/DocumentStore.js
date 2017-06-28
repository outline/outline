// @flow
import { observable, action, computed } from 'mobx';
import get from 'lodash/get';
import invariant from 'invariant';
import { client } from 'utils/ApiClient';
import emojify from 'utils/emojify';
import Document from 'models/Document';
import UiStore from 'stores/UiStore';

type SaveProps = { redirect?: boolean };

const parseHeader = text => {
  const firstLine = text.split(/\r?\n/)[0];
  if (firstLine) {
    const match = firstLine.match(/^#+ +(.*)$/);

    if (match) {
      return emojify(match[1]);
    } else {
      return '';
    }
  }
  return '';
};

type Options = {
  history: Object,
  ui: UiStore,
};

class DocumentStore {
  document: Document;
  @observable collapsedNodes: string[] = [];
  @observable documentId = null;
  @observable collectionId = null;
  @observable parentDocument: Document;
  @observable hasPendingChanges = false;
  @observable newDocument: ?boolean;
  @observable newChildDocument: ?boolean;

  @observable isEditing: boolean = false;
  @observable isFetching: boolean = false;
  @observable isSaving: boolean = false;
  @observable isUploading: boolean = false;

  history: Object;
  ui: UiStore;

  /* Computed */

  @computed get isCollection(): boolean {
    return !!this.document && this.document.collection.type === 'atlas';
  }

  /* Actions */

  @action starDocument = async () => {
    this.document.starred = true;
    try {
      await client.post('/documents.star', {
        id: this.documentId,
      });
    } catch (e) {
      this.document.starred = false;
      console.error('Something went wrong');
    }
  };

  @action unstarDocument = async () => {
    this.document.starred = false;
    try {
      await client.post('/documents.unstar', {
        id: this.documentId,
      });
    } catch (e) {
      this.document.starred = true;
      console.error('Something went wrong');
    }
  };

  @action viewDocument = async () => {
    await client.post('/views.create', {
      id: this.documentId,
    });
  };

  @action fetchDocument = async () => {
    this.isFetching = true;

    try {
      const res = await client.get('/documents.info', {
        id: this.documentId,
      });
      invariant(res && res.data, 'Data should be available');
      if (this.newChildDocument) {
        this.parentDocument = res.data;
      } else {
        this.document = new Document(res.data);
        this.ui.setActiveDocument(this.document);
      }
    } catch (e) {
      console.error('Something went wrong');
    }
    this.isFetching = false;
  };

  @action saveDocument = async ({ redirect = true }: SaveProps) => {
    if (this.isSaving) return;

    this.isSaving = true;

    try {
      const res = await client.post('/documents.create', {
        parentDocument: get(this.parentDocument, 'id'),
        collection: get(
          this.parentDocument,
          'collection.id',
          this.collectionId
        ),
        title: get(this.document, 'title', 'Untitled document'),
        text: get(this.document, 'text'),
      });
      invariant(res && res.data, 'Data should be available');
      const { url } = res.data;

      this.hasPendingChanges = false;
      if (redirect) this.history.push(url);
    } catch (e) {
      console.error('Something went wrong');
    }
    this.isSaving = false;
  };

  @action updateDocument = async ({ redirect = true }: SaveProps) => {
    if (this.isSaving) return;

    this.isSaving = true;

    try {
      const res = await client.post('/documents.update', {
        id: this.documentId,
        title: get(this.document, 'title', 'Untitled document'),
        text: get(this.document, 'text'),
      });
      invariant(res && res.data, 'Data should be available');
      const { url } = res.data;

      this.hasPendingChanges = false;
      if (redirect) this.history.push(url);
    } catch (e) {
      console.error('Something went wrong');
    }
    this.isSaving = false;
  };

  @action deleteDocument = async () => {
    this.isFetching = true;

    try {
      await client.post('/documents.delete', { id: this.documentId });
      this.history.push(this.document.collection.url);
    } catch (e) {
      console.error('Something went wrong');
    }
    this.isFetching = false;
  };

  @action updateText = (text: string) => {
    if (!this.document) return;

    this.document.text = text;
    this.document.title = parseHeader(text);
    this.hasPendingChanges = true;
  };

  @action updateUploading = (uploading: boolean) => {
    this.isUploading = uploading;
  };

  constructor(options: Options) {
    this.history = options.history;
    this.ui = options.ui;
  }
}

export default DocumentStore;
