import { observable, action, computed, autorun } from 'mobx';
import { client } from 'utils/ApiClient';
import localforage from 'localforage';
import { convertToMarkdown } from 'utils/markdown';
import { browserHistory } from 'react-router'

const DOCUMENT_EDIT_SETTINGS = 'DOCUMENT_EDIT_SETTINGS';

const parseHeader = (text) => {
  const firstLine = text.split(/\r?\n/)[0];
  const match = firstLine.match(/^#+ +(.*)$/);

  if (match) {
    return match[1];
  }
}

const documentEditState = new class DocumentEditState {
    @observable documentId = null;
    @observable title = 'title';
    @observable text = 'default state';

    @observable preview;
    @observable isFetching;
    @observable isSaving;

    /* Computed */

    @computed get htmlPreview() {
      // Only compute if preview is active
      if (this.preview) {
        return convertToMarkdown(this.text);
      }
    }

    /* Actions */

    @action fetchDocument = async () => {
      this.isFetching = true;

      try {
        const data = await client.post('/documents.info', {
          id: this.documentId,
        })
        const { title, text } = data.data;
        this.title = title;
        this.text = text;
      } catch (e) {
        console.error("Something went wrong");
      }
      this.isFetching = false;
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

    constructor() {
      // Rehydrate syncronously
      localforage.getItem(DOCUMENT_EDIT_SETTINGS)
      .then(data => {
        this.preview = data.preview;
      });
    }
}();

// Persist settings to localStorage
autorun(() => {
  localforage.setItem(DOCUMENT_EDIT_SETTINGS, {
    preview: documentEditState.preview,
  });
});


export default documentEditState;