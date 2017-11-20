// @flow
import { observable, computed, action, runInAction, ObservableMap } from 'mobx';
import ApiClient, { client } from 'utils/ApiClient';
import _ from 'lodash';
import invariant from 'invariant';

import stores from 'stores';
import Collection from 'models/Collection';
import ErrorsStore from 'stores/ErrorsStore';
import UiStore from 'stores/UiStore';

type Options = {
  ui: UiStore,
};

type DocumentPathItem = {
  id: string,
  title: string,
  url: string,
  type: 'document' | 'collection',
};

export type DocumentPath = DocumentPathItem & {
  path: DocumentPathItem[],
};

class CollectionsStore {
  @observable data: Map<string, Collection> = new ObservableMap([]);
  @observable isLoaded: boolean = false;
  @observable isFetching: boolean = false;

  client: ApiClient;
  errors: ErrorsStore;
  ui: UiStore;

  @computed
  get active(): ?Collection {
    return this.ui.activeCollectionId
      ? this.getById(this.ui.activeCollectionId)
      : undefined;
  }

  @computed
  get orderedData(): Collection[] {
    return _.sortBy(this.data.values(), 'name');
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
        results.push(_.concat(path, node));
        travelDocuments(document.children, _.concat(path, [node]));
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
      const tail = _.last(result);
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

  /* Actions */

  @action
  fetchAll = async (): Promise<*> => {
    this.isFetching = true;

    try {
      const res = await this.client.post('/collections.list');
      invariant(res && res.data, 'Collection list not available');
      const { data } = res;
      runInAction('CollectionsStore#fetchAll', () => {
        data.forEach(collection => {
          this.data.set(collection.id, new Collection(collection));
        });
        this.isLoaded = true;
      });
    } catch (e) {
      this.errors.add('Failed to load collections');
    } finally {
      this.isFetching = false;
    }
  };

  @action
  fetch = async (id: string): Promise<?Collection> => {
    let collection = this.getById(id);
    if (collection) return collection;

    this.isFetching = true;

    try {
      const res = await this.client.post('/collections.info', {
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
    } catch (e) {
      this.errors.add('Something went wrong');
    } finally {
      this.isFetching = false;
    }
  };

  @action
  add = (collection: Collection): void => {
    this.data.set(collection.id, collection);
  };

  @action
  remove = (id: string): void => {
    this.data.delete(id);
  };

  getById = (id: string): ?Collection => {
    return this.data.get(id);
  };

  constructor(options: Options) {
    this.client = client;
    this.errors = stores.errors;
    this.ui = options.ui;
  }
}

export default CollectionsStore;
