// @flow
import { observable, action, computed, toJS } from 'mobx';
import get from 'lodash/get';
import invariant from 'invariant';
import { client } from 'utils/ApiClient';
import emojify from 'utils/emojify';
import type { Document, NavigationNode } from 'types';

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
};

class DocumentStore {
  @observable collapsedNodes: string[] = [];
  @observable documentId = null;
  @observable collectionId = null;
  @observable document: Document;
  @observable parentDocument: Document;
  @observable hasPendingChanges = false;
  @observable newDocument: ?boolean;
  @observable newChildDocument: ?boolean;

  @observable isEditing: boolean = false;
  @observable isFetching: boolean = false;
  @observable isSaving: boolean = false;
  @observable isUploading: boolean = false;

  history: Object;

  /* Computed */

  @computed get isCollection(): boolean {
    return !!this.document && this.document.collection.type === 'atlas';
  }

  @computed get collectionTree(): ?Object {
    if (
      this.document &&
      this.document.collection &&
      this.document.collection.type === 'atlas'
    ) {
      const tree = this.document.collection.navigationTree;
      const collapseNodes = node => {
        node.collapsed = this.collapsedNodes.includes(node.id);
        node.children = node.children.map(childNode => {
          return collapseNodes(childNode);
        });

        return node;
      };

      return collapseNodes(toJS(tree));
    }
  }

  @computed get pathToDocument(): Array<NavigationNode> {
    let path;
    const traveler = (node, previousPath) => {
      if (this.document && node.id === this.document.id) {
        path = previousPath;
        return;
      } else {
        node.children.forEach(childNode => {
          const newPath = [...previousPath, node];
          return traveler(childNode, newPath);
        });
      }
    };

    if (this.document && this.collectionTree) {
      traveler(this.collectionTree, []);
      invariant(path, 'Path is not available for collection, abort');
      return path.splice(1);
    }

    return [];
  }

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
      invariant(res && res.data, 'Data should be available');
      if (this.newChildDocument) {
        this.parentDocument = res.data;
      } else {
        this.document = res.data;
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
      const res = await client.post(
        '/documents.create',
        {
          parentDocument: get(this.parentDocument, 'id'),
          collection: get(
            this.parentDocument,
            'collection.id',
            this.collectionId
          ),
          title: get(this.document, 'title', 'Untitled document'),
          text: get(this.document, 'text'),
        },
        { cache: true }
      );
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
      const res = await client.post(
        '/documents.update',
        {
          id: this.documentId,
          title: get(this.document, 'title', 'Untitled document'),
          text: get(this.document, 'text'),
        },
        { cache: true }
      );
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
  }
}

export default DocumentStore;
