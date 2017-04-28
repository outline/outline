import { observable, action, toJS, autorun } from 'mobx';
import { client } from 'utils/ApiClient';
import { browserHistory } from 'react-router';
import emojify from 'utils/emojify';

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
  @observable parentDocument;
  @observable title;
  @observable text;
  @observable hasPendingChanges = false;
  @observable newDocument;
  @observable newChildDocument;

  @observable preview;
  @observable isFetching;
  @observable isSaving;
  @observable isUploading;

  /* Actions */

  @action fetchDocument = async () => {
    this.isFetching = true;

    try {
      const data = await client.get(
        '/documents.info',
        {
          id: this.documentId,
        },
        { cache: true }
      );
      if (this.newChildDocument) {
        this.parentDocument = data.data;
      } else {
        const { title, text } = data.data;
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
      const data = await client.post(
        '/documents.create',
        {
          parentDocument: this.parentDocument && this.parentDocument.id,
          collection: this.collectionId || this.parentDocument.collection.id,
          title: this.title || 'Untitled document',
          text: this.text,
        },
        { cache: true }
      );
      const { url } = data.data;

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
      const data = await client.post(
        '/documents.update',
        {
          id: this.documentId,
          title: this.title || 'Untitled document',
          text: this.text,
        },
        { cache: true }
      );
      const { url } = data.data;

      this.hasPendingChanges = false;
      browserHistory.push(url);
    } catch (e) {
      console.error('Something went wrong');
    }
    this.isSaving = false;
  };

  @action updateText = text => {
    this.text = text;
    this.title = parseHeader(text);
    this.hasPendingChanges = true;
  };

  @action updateTitle = title => {
    this.title = title;
  };

  @action replaceText = args => {
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

  constructor(settings) {
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
