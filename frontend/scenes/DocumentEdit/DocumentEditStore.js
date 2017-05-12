// @flow
import { observable, action, toJS, autorun } from 'mobx';
import { browserHistory } from 'react-router';
import invariant from 'invariant';
import { client } from 'utils/ApiClient';
import emojify from 'utils/emojify';
import type { Document } from 'types';

const DOCUMENT_EDIT_SETTINGS = 'DOCUMENT_EDIT_SETTINGS';

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

class DocumentEditStore {
  @observable documentId = null;
  @observable collectionId = null;
  @observable parentDocument: ?Document;
  @observable title: string;
  @observable text: string;
  @observable hasPendingChanges = false;
  @observable newDocument: ?boolean;
  @observable newChildDocument: ?boolean;

  @observable preview: ?boolean = false;
  @observable isFetching: boolean = false;
  @observable isSaving: boolean = false;
  @observable isUploading: boolean = false;

  /* Actions */

  @action fetchDocument = async () => {
    this.isFetching = true;

    try {
      const res = await client.get(
        '/documents.info',
        {
          id: this.documentId,
        },
        { cache: true }
      );
      invariant(res && res.data, 'Data shoule be available');
      if (this.newChildDocument) {
        this.parentDocument = res.data;
      } else {
        const { title, text } = res.data;
        this.title = title;
        this.text = text;
      }
    } catch (e) {
      console.error('Something went wrong');
    }
    this.isFetching = false;
  };

  @action saveDocument = async () => {
    if (this.isSaving) return;

    this.isSaving = true;

    try {
      const res = await client.post(
        '/documents.create',
        {
          parentDocument: this.parentDocument && this.parentDocument.id,
          // $FlowFixMe this logic will probably get rewritten soon anyway
          collection: this.collectionId || this.parentDocument.collection.id,
          title: this.title || 'Untitled document',
          text: this.text,
        },
        { cache: true }
      );
      invariant(res && res.data, 'Data shoule be available');
      const { url } = res.data;

      this.hasPendingChanges = false;
      browserHistory.push(url);
    } catch (e) {
      console.error('Something went wrong');
    }
    this.isSaving = false;
  };

  @action updateDocument = async () => {
    if (this.isSaving) return;

    this.isSaving = true;

    try {
      const res = await client.post(
        '/documents.update',
        {
          id: this.documentId,
          title: this.title || 'Untitled document',
          text: this.text,
        },
        { cache: true }
      );
      invariant(res && res.data, 'Data shoule be available');
      const { url } = res.data;

      this.hasPendingChanges = false;
      browserHistory.push(url);
    } catch (e) {
      console.error('Something went wrong');
    }
    this.isSaving = false;
  };

  @action updateText = (text: string) => {
    this.text = text;
    this.title = parseHeader(text);
    this.hasPendingChanges = true;
  };

  @action updateTitle = (title: string) => {
    this.title = title;
  };

  @action replaceText = (args: { original: string, new: string }) => {
    this.text = this.text.replace(args.original, args.new);
    this.hasPendingChanges = true;
  };

  @action togglePreview = () => {
    this.preview = !this.preview;
  };

  @action reset = () => {
    this.title = 'Lets start with a title';
    this.text = '# Lets start with a title\n\nAnd continue from there...';
  };

  @action toggleUploadingIndicator = () => {
    this.isUploading = !this.isUploading;
  };

  // Generic

  persistSettings = () => {
    localStorage[DOCUMENT_EDIT_SETTINGS] = JSON.stringify({
      preview: toJS(this.preview),
    });
  };

  constructor(settings: { preview: ?boolean }) {
    // Rehydrate settings
    this.preview = settings.preview;

    // Persist settings to localStorage
    // TODO: This could be done more selectively
    autorun(() => {
      this.persistSettings();
    });
  }
}

export default DocumentEditStore;
export { DOCUMENT_EDIT_SETTINGS };
