// @flow
import { observable, action, computed, ObservableMap, runInAction } from 'mobx';
import { client } from 'utils/ApiClient';
import _ from 'lodash';
import invariant from 'invariant';

import BaseStore from 'stores/BaseStore';
import Document from 'models/Document';
import UiStore from 'stores/UiStore';
import type { PaginationParams } from 'types';

export const DEFAULT_PAGINATION_LIMIT = 25;

type Options = {
  ui: UiStore,
};

type FetchOptions = {
  prefetch?: boolean,
  shareId?: string,
};

class DocumentsStore extends BaseStore {
  @observable recentlyViewedIds: Array<string> = [];
  @observable recentlyEditedIds: Array<string> = [];
  @observable data: Map<string, Document> = new ObservableMap([]);
  @observable isLoaded: boolean = false;
  @observable isFetching: boolean = false;

  ui: UiStore;

  /* Computed */

  @computed
  get recentlyViewed(): Array<Document> {
    const docs = [];
    this.recentlyViewedIds.forEach(id => {
      const doc = this.getById(id);
      if (doc) docs.push(doc);
    });
    return docs;
  }

  @computed
  get recentlyEdited(): Document[] {
    const docs = [];
    this.recentlyEditedIds.forEach(id => {
      const doc = this.getById(id);
      if (doc) docs.push(doc);
    });
    return docs;
  }

  pinnedInCollection(collectionId: string): Document[] {
    return _.filter(
      this.recentlyEditedInCollection(collectionId),
      document => document.pinned
    );
  }

  recentlyEditedInCollection(collectionId: string): Document[] {
    return _.orderBy(
      _.filter(
        this.data.values(),
        document =>
          document.collectionId === collectionId && !!document.publishedAt
      ),
      'updatedAt',
      'desc'
    );
  }

  @computed
  get starred(): Document[] {
    return _.filter(this.data.values(), 'starred');
  }

  @computed
  get drafts(): Document[] {
    return _.filter(
      _.orderBy(this.data.values(), 'updatedAt', 'desc'),
      doc => !doc.publishedAt
    );
  }

  @computed
  get active(): ?Document {
    return this.ui.activeDocumentId
      ? this.getById(this.ui.activeDocumentId)
      : undefined;
  }

  /* Actions */

  @action
  fetchPage = async (
    request: string = 'list',
    options: ?PaginationParams
  ): Promise<*> => {
    this.isFetching = true;

    try {
      const res = await client.post(`/documents.${request}`, options);
      invariant(res && res.data, 'Document list not available');
      const { data } = res;
      runInAction('DocumentsStore#fetchPage', () => {
        data.forEach(document => {
          this.data.set(document.id, new Document(document));
        });
        this.isLoaded = true;
      });
      return data;
    } catch (e) {
      this.ui.showToast('Failed to load documents');
    } finally {
      this.isFetching = false;
    }
  };

  @action
  fetchRecentlyModified = async (options: ?PaginationParams): Promise<*> => {
    const data = await this.fetchPage('list', options);

    runInAction('DocumentsStore#fetchRecentlyModified', () => {
      this.recentlyEditedIds = _.map(data, 'id');
    });
    return data;
  };

  @action
  fetchRecentlyViewed = async (options: ?PaginationParams): Promise<*> => {
    const data = await this.fetchPage('viewed', options);

    runInAction('DocumentsStore#fetchRecentlyViewed', () => {
      this.recentlyViewedIds = _.map(data, 'id');
    });
    return data;
  };

  @action
  fetchStarred = async (options: ?PaginationParams): Promise<*> => {
    await this.fetchPage('starred', options);
  };

  @action
  fetchDrafts = async (options: ?PaginationParams): Promise<*> => {
    await this.fetchPage('drafts', options);
  };

  @action
  fetchPinned = async (options: ?PaginationParams): Promise<*> => {
    await this.fetchPage('pinned', options);
  };

  @action
  search = async (
    query: string,
    options: ?PaginationParams
  ): Promise<string[]> => {
    const res = await client.get('/documents.search', {
      ...options,
      query,
    });
    invariant(res && res.data, 'res or res.data missing');
    const { data } = res;
    data.forEach(documentData => this.add(new Document(documentData)));
    return data.map(documentData => documentData.id);
  };

  @action
  prefetchDocument = async (id: string) => {
    if (!this.getById(id)) {
      this.fetch(id, { prefetch: true });
    }
  };

  @action
  fetch = async (id: string, options?: FetchOptions = {}): Promise<*> => {
    if (!options.prefetch) this.isFetching = true;

    try {
      const doc = this.getById(id) || this.getByUrl(id);
      if (doc) return doc;

      const res = await client.post('/documents.info', {
        id,
        shareId: options.shareId,
      });
      invariant(res && res.data, 'Document not available');
      const { data } = res;
      const document = new Document(data);

      runInAction('DocumentsStore#fetch', () => {
        this.data.set(data.id, document);
        this.isLoaded = true;
      });

      return document;
    } catch (e) {
      this.ui.showToast('Failed to load document');
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

    this.ui = options.ui;

    this.on('documents.delete', (data: { id: string }) => {
      this.remove(data.id);
    });
    this.on('documents.create', (data: Document) => {
      this.add(new Document(data));
    });

    // Re-fetch dashboard content so that we don't show deleted documents
    this.on('collections.delete', () => {
      this.fetchRecentlyModified();
      this.fetchRecentlyViewed();
    });
    this.on('documents.delete', () => {
      this.fetchRecentlyModified();
      this.fetchRecentlyViewed();
    });
  }
}

export default DocumentsStore;
