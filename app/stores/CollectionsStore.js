// @flow
import { computed, action, runInAction } from 'mobx';
import { concat, last } from 'lodash';
import invariant from 'invariant';
import { client } from 'utils/ApiClient';

import BaseStore from './BaseStore';
import RootStore from './RootStore';
import Collection from 'models/Collection';
import naturalSort from 'shared/utils/naturalSort';

type DocumentPathItem = {
  id: string,
  title: string,
  url: string,
  type: 'document' | 'collection',
};

export type DocumentPath = DocumentPathItem & {
  path: DocumentPathItem[],
};

export default class CollectionsStore extends BaseStore<Collection> {
  actions = ['list', 'create', 'update', 'delete'];

  constructor(rootStore: RootStore) {
    super(rootStore, Collection);
  }

  @computed
  get active(): ?Collection {
    return this.rootStore.ui.activeCollectionId
      ? this.getById(this.rootStore.ui.activeCollectionId)
      : undefined;
  }

  @computed
  get orderedData(): Collection[] {
    return naturalSort(Array.from(this.data.values()), 'name');
  }

  /**
   * List of paths to each of the documents, where paths are composed of id and title/name pairs
   */
  @computed
  get pathsToDocuments(): Array<DocumentPath> {
    let results = [];
    const travelDocuments = (documentList, path) =>
      documentList.forEach(document => {
        const { id, title, url } = document;
        const node = { id, title, url, type: 'document' };
        results.push(concat(path, node));
        travelDocuments(document.children, concat(path, [node]));
      });

    if (this.isLoaded) {
      this.data.forEach(collection => {
        const { id, name, url } = collection;
        const node = { id, title: name, url, type: 'collection' };
        results.push([node]);
        travelDocuments(collection.documents, [node]);
      });
    }

    return results.map(result => {
      const tail = last(result);
      return {
        ...tail,
        path: result,
      };
    });
  }

  getPathForDocument(documentId: string): ?DocumentPath {
    return this.pathsToDocuments.find(path => path.id === documentId);
  }

  titleForDocument(documentUrl: string): ?string {
    const path = this.pathsToDocuments.find(path => path.url === documentUrl);
    if (path) return path.title;
  }

  @action
  fetch = async (id: string): Promise<?Collection> => {
    let collection: ?Collection = this.getById(id);
    if (collection) return collection;

    this.isFetching = true;

    try {
      const res = await client.post('/collections.info', {
        id,
      });
      invariant(res && res.data, 'Collection not available');
      const { data } = res;
      const collection = new Collection(data);

      runInAction('CollectionsStore#fetch', () => {
        this.data.set(data.id, collection);
        this.isLoaded = true;
      });

      return collection;
    } finally {
      this.isFetching = false;
    }
  };

  @action
  export = async () => {
    await client.post('/collections.exportAll');
    return true;
  };
}
