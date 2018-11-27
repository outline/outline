// @flow
import { computed, action, runInAction } from 'mobx';
import { concat, last } from 'lodash';
import invariant from 'invariant';
import { client } from 'utils/ApiClient';

import BaseStore from './BaseStore';
import RootStore from './RootStore';
import Collection from 'models/Collection';
import naturalSort from 'shared/utils/naturalSort';
import type { FetchOptions } from 'types';

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
      ? this.data.get(this.rootStore.ui.activeCollectionId)
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
  get pathsToDocuments(): DocumentPath[] {
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

  delete = async (collection: Collection) => {
    super.delete(collection);

    runInAction(() => {
      this.rootStore.documents.fetchRecentlyUpdated();
      this.rootStore.documents.fetchRecentlyViewed();
    });
  };

  @action
  fetch = async (
    id: string,
    options?: FetchOptions = {}
  ): Promise<?Collection> => {
    let collection: ?Collection = this.data.get(id);
    if (collection && !options.force) return collection;

    this.isFetching = true;

    try {
      const res = await client.post('/collections.info', {
        id,
      });
      invariant(res && res.data, 'Collection not available');
      this.add(res.data);

      runInAction('CollectionsStore#fetch', () => {
        this.isLoaded = true;
      });

      return this.data.get(res.data.id);
    } finally {
      this.isFetching = false;
    }
  };

  export = () => {
    return client.post('/collections.exportAll');
  };
}
