import { observable, action, computed, autorun, toJS } from 'mobx';
import { client } from 'utils/ApiClient';
import localforage from 'localforage';
import { browserHistory } from 'react-router';
import emojify from 'utils/emojify';

const DOCUMENT_EDIT_SETTINGS = 'DOCUMENT_EDIT_SETTINGS';

const parseHeader = (text) => {
  const firstLine = text.split(/\r?\n/)[0];
  const match = firstLine.match(/^#+ +(.*)$/);

  if (match) {
    return emojify(match[1]);
  }
}

const documentEditStore = new class DocumentEditStore {
    @observable documentId = null;
    @observable atlasId = null;
    @observable parentDocument;
    @observable title;
    @observable text;
    @observable newDocument;
    @observable newChildDocument;

    @observable preview;
    @observable isFetching;
    @observable isSaving;

    /* Actions */

    @action fetchDocument = async () => {
      this.isFetching = true;

      try {
        const data = await client.post('/documents.info', {
          id: this.documentId,
        })
        if (this.newChildDocument) {
          this.parentDocument = data.data;
        } else {
          const { title, text } = data.data;
          this.title = title;
          this.text = text;
        }
      } catch (e) {
        console.error("Something went wrong");
      }
      this.isFetching = false;
    }

    @action saveDocument = async (nextPath) => {
      if (this.isSaving) return;

      this.isSaving = true;

      try {
        const data = await client.post('/documents.create', {
          parentDocument: this.parentDocument && this.parentDocument.id,
          atlas: this.atlasId || this.parentDocument.atlas.id,
          title: this.title,
          text: this.text,
        })
        const { id } = data.data;
        browserHistory.push(`/documents/${id}`);
      } catch (e) {
        console.error("Something went wrong");
      }
      this.isSaving = false;
    }

    @action updateDocument = async (nextPath) => {
      if (this.isSaving) return;

      this.isSaving = true;

      try {
        const data = await client.post('/documents.update', {
          id: this.documentId,
          title: this.title,
          text: this.text,
        })
        browserHistory.push(`/documents/${this.documentId}`);
      } catch (e) {
        console.error("Something went wrong");
      }
      this.isSaving = false;
    }

    @action updateText = (text) => {
      this.text = text;
      this.title = parseHeader(text);
    }

    @action updateTitle = (title) => {
      this.title = title;
    }

    @action replaceText = (args) => {
      this.text = this.text.replace(args.original, args.new);
    }

    @action togglePreview = () => {
      this.preview = !this.preview;
    }

    @action reset = () => {
      this.title = 'Lets start with a title';
      this.text = '# Lets start with a title\n\nAnd continue from there...';
    }

    constructor() {
      // Rehydrate settings
      localforage.getItem(DOCUMENT_EDIT_SETTINGS)
      .then(data => {
        this.preview = data.preview;
      });
    }
}();

// Persist settings to localStorage
autorun(() => {
  localforage.setItem(DOCUMENT_EDIT_SETTINGS, {
    preview: documentEditStore.preview,
  });
});

export default documentEditStore;
