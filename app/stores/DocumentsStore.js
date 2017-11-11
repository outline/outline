// @flow
import {
  observable,
  action,
  computed,
  ObservableMap,
  runInAction,
  autorunAsync,
} from 'mobx';
import { client } from 'utils/ApiClient';
import _ from 'lodash';
import invariant from 'invariant';

import BaseStore from 'stores/BaseStore';
import stores from 'stores';
import Document from 'models/Document';
import ErrorsStore from 'stores/ErrorsStore';
import CacheStore from 'stores/CacheStore';
import UiStore from 'stores/UiStore';

const DOCUMENTS_CACHE_KEY = 'DOCUMENTS_CACHE_KEY';

type Options = {
  cache: CacheStore,
  ui: UiStore,
};

class DocumentsStore extends BaseStore {
  @observable recentlyViewedIds: Array<string> = [];
  @observable data: Map<string, Document> = new ObservableMap([]);
  @observable isLoaded: boolean = false;
  @observable isFetching: boolean = false;

  errors: ErrorsStore;
  cache: CacheStore;
  ui: UiStore;

  /* Computed */

  @computed
  get recentlyViewed(): Array<Document> {
    return _.take(
      _.filter(this.data.values(), ({ id }) =>
        this.recentlyViewedIds.includes(id)
      ),
      5
    );
  }

  @computed
  get recentlyEdited(): Array<Document> {
    return _.take(_.orderBy(this.data.values(), 'updatedAt', 'desc'), 5);
  }

  @computed
  get starred(): Array<Document> {
    return _.filter(this.data.values(), 'starred');
  }

  @computed
  get active(): ?Document {
    return this.ui.activeDocumentId
      ? this.getById(this.ui.activeDocumentId)
      : undefined;
  }

  /* Actions */

  @action
  fetchAll = async (request: string = 'list', options: ?Object): Promise<*> => {
    this.isFetching = true;

    try {
      const res = await client.post(`/documents.${request}`, options);
      invariant(res && res.data, 'Document list not available');
      const { data } = res;
      runInAction('DocumentsStore#fetchAll', () => {
        data.forEach(document => {
          this.data.set(document.id, new Document(document));
        });
        this.isLoaded = true;
      });
      return data;
    } catch (e) {
      this.errors.add('Failed to load documents');
    } finally {
      this.isFetching = false;
    }
  };

  @action
  fetchRecentlyModified = async (options: ?Object): Promise<*> => {
    return await this.fetchAll('list', options);
  };

  @action
  fetchRecentlyViewed = async (options: ?Object): Promise<*> => {
    const data = await this.fetchAll('viewed', options);

    runInAction('DocumentsStore#fetchRecentlyViewed', () => {
      this.recentlyViewedIds = _.map(data, 'id');
    });
    return data;
  };

  @action
  fetchStarred = async (): Promise<*> => {
    await this.fetchAll('starred');
  };

  @action
  search = async (query: string): Promise<*> => {
    const res = await client.get('/documents.search', { query });
    invariant(res && res.data, 'res or res.data missing');
    const { data } = res;
    data.forEach(documentData => this.add(new Document(documentData)));
    return data.map(documentData => documentData.id);
  };

  @action
  prefetchDocument = async (id: string) => {
    if (!this.getById(id)) this.fetch(id, true);
  };

  @action
  fetch = async (id: string, prefetch?: boolean): Promise<*> => {
    if (!prefetch) this.isFetching = true;

    try {
      const res = await client.post('/documents.info', { id });
      invariant(res && res.data, 'Document not available');
      const { data } = res;
      const document = new Document(data);

      runInAction('DocumentsStore#fetch', () => {
        this.data.set(data.id, document);
        this.isLoaded = true;
      });

      return document;
    } catch (e) {
      this.errors.add('Failed to load documents');
    } finally {
      this.isFetching = false;
    }
  };

  @action
  add = (document: Document): void => {
    this.data.set(document.id, document);
  };

  @action
  remove = (id: string): void => {
    this.data.delete(id);
  };

  getById = (id: string): ?Document => {
    return this.data.get(id);
  };

  /**
   * Match documents by the url ID as the title slug can change
   */
  getByUrl = (url: string): ?Document => {
    return _.find(this.data.values(), doc => url.endsWith(doc.urlId));
  };

  constructor(options: Options) {
    super();

    this.errors = stores.errors;
    this.cache = options.cache;
    this.ui = options.ui;

    this.cache.getItem(DOCUMENTS_CACHE_KEY).then(data => {
      if (data) {
        data.forEach(document => this.add(new Document(document)));
      }
    });

    this.on('documents.delete', (data: { id: string }) => {
      this.remove(data.id);
    });

    autorunAsync('DocumentsStore.persists', () => {
      if (this.data.size) {
        this.cache.setItem(
          DOCUMENTS_CACHE_KEY,
          Array.from(this.data.values()).map(collection => collection.data)
        );
      }
    });
  }
}

export default DocumentsStore;
