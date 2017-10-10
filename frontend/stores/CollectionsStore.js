// @flow
import {
  observable,
  computed,
  action,
  runInAction,
  ObservableArray,
} from 'mobx';
import ApiClient, { client } from 'utils/ApiClient';
import _ from 'lodash';
import invariant from 'invariant';

import stores from 'stores';
import Collection from 'models/Collection';
import ErrorsStore from 'stores/ErrorsStore';
import CacheStore from 'stores/CacheStore';
import UiStore from 'stores/UiStore';

type Options = {
  teamId: string,
  cache: CacheStore,
  ui: UiStore,
};

type DocumentPathItem = {
  id: string,
  title: string,
  type: 'document' | 'collection',
};

export type DocumentPath = DocumentPathItem & {
  path: Array<DocumentPathItem>,
};

class CollectionsStore {
  @observable data: ObservableArray<Collection> = observable.array([]);
  @observable isLoaded: boolean = false;

  client: ApiClient;
  teamId: string;
  errors: ErrorsStore;
  cache: CacheStore;
  ui: UiStore;

  @computed get active(): ?Collection {
    return this.ui.activeCollectionId
      ? this.getById(this.ui.activeCollectionId)
      : undefined;
  }

  @computed get orderedData(): Collection[] {
    return _.sortBy(this.data, collection => collection.name);
  }

  /**
   * List of paths to each of the documents, where paths are composed of id and title/name pairs
   */
  @computed get pathsToDocuments(): Array<DocumentPath> {
    let results = [];
    const travelDocuments = (documentList, path) =>
      documentList.forEach(document => {
        const { id, title } = document;
        const node = { id, title, type: 'document' };
        results.push(_.concat(path, node));
        travelDocuments(document.children, _.concat(path, [node]));
      });

    if (this.isLoaded) {
      this.data.forEach(collection => {
        const { id, name } = collection;
        const node = { id, title: name, type: 'collection' };
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

  /* Actions */

  @action fetchAll = async (): Promise<*> => {
    try {
      const res = await this.client.post('/collections.list', {
        id: this.teamId,
      });
      invariant(res && res.data, 'Collection list not available');
      const { data } = res;
      runInAction('CollectionsStore#fetch', () => {
        this.data.replace(data.map(collection => new Collection(collection)));
        this.isLoaded = true;
      });
    } catch (e) {
      this.errors.add('Failed to load collections');
    }
  };

  @action fetchById = async (id: string): Promise<?Collection> => {
    let collection = this.getById(id);
    if (!collection) {
      try {
        const res = await this.client.post('/collections.info', {
          id,
        });
        invariant(res && res.data, 'Collection not available');
        const { data } = res;
        runInAction('CollectionsStore#getById', () => {
          collection = new Collection(data);
          this.add(collection);
        });
      } catch (e) {
        Bugsnag.notify(e);
        this.errors.add('Something went wrong');
      }
    }

    return collection;
  };

  @action add = (collection: Collection): void => {
    this.data.push(collection);
  };

  @action remove = (id: string): void => {
    this.data.splice(this.data.indexOf(id), 1);
  };

  getById = (id: string): ?Collection => {
    return _.find(this.data, { id });
  };

  constructor(options: Options) {
    this.client = client;
    this.errors = stores.errors;
    this.teamId = options.teamId;
    this.cache = options.cache;
    this.ui = options.ui;
  }
}

export default CollectionsStore;
