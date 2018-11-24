// @flow
import { observable, action, computed, runInAction } from 'mobx';
import { map, find, orderBy, filter, compact, uniq } from 'lodash';
import { client } from 'utils/ApiClient';
import naturalSort from 'shared/utils/naturalSort';
import invariant from 'invariant';

import BaseStore from 'stores/BaseStore';
import RootStore from 'stores/RootStore';
import Document from 'models/Document';
import type { PaginationParams, SearchResult } from 'types';

type FetchOptions = {
  prefetch?: boolean,
  shareId?: string,
};

class DocumentsStore extends BaseStore<Document> {
  @observable recentlyViewedIds: string[] = [];
  @observable recentlyUpdatedIds: string[] = [];

  constructor(rootStore: RootStore) {
    super({
      model: Document,
      rootStore,
    });

    this.on('documents.delete', (data: { id: string }) => {
      this.remove(data.id);
    });
    this.on('documents.create', (data: Document) => {
      this.add(data);
    });

    // Re-fetch dashboard content so that we don't show deleted documents
    this.on('collections.delete', () => {
      this.fetchRecentlyUpdated();
      this.fetchRecentlyViewed();
    });
    this.on('documents.delete', () => {
      this.fetchRecentlyUpdated();
      this.fetchRecentlyViewed();
    });
  }

  @computed
  get recentlyViewed(): Document[] {
    return orderBy(
      compact(this.recentlyViewedIds.map(this.getById)),
      'updatedAt',
      'desc'
    );
  }

  @computed
  get recentlyUpdated(): Document[] {
    return orderBy(
      compact(this.recentlyUpdatedIds.map(this.getById)),
      'updatedAt',
      'desc'
    );
  }

  createdByUser(userId: string): Document[] {
    return orderBy(
      filter(this.data.values(), document => document.createdBy.id === userId),
      'updatedAt',
      'desc'
    );
  }

  pinnedInCollection(collectionId: string): Document[] {
    return filter(
      this.recentlyUpdatedInCollection(collectionId),
      document => document.pinned
    );
  }

  recentlyUpdatedInCollection(collectionId: string): Document[] {
    return orderBy(
      filter(
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
    return filter(this.data.values(), 'starred');
  }

  @computed
  get starredAlphabetical(): Document[] {
    return naturalSort(this.starred, 'title');
  }

  @computed
  get drafts(): Document[] {
    return filter(
      orderBy(this.data.values(), 'updatedAt', 'desc'),
      doc => !doc.publishedAt
    );
  }

  @computed
  get active(): ?Document {
    return this.ui.activeDocumentId
      ? this.getById(this.ui.activeDocumentId)
      : undefined;
  }

  @action
  fetchNamedPage = async (
    request: string = 'list',
    options: ?PaginationParams
  ): Promise<?(Document[])> => {
    this.isFetching = true;

    try {
      const res = await client.post(`/documents.${request}`, options);
      invariant(res && res.data, 'Document list not available');
      const { data } = res;
      runInAction('DocumentsStore#fetchNamedPage', () => {
        data.forEach(document => {
          this.data.set(document.id, new Document(document));
        });
        this.isLoaded = true;
      });
      return data;
    } finally {
      this.isFetching = false;
    }
  };

  @action
  fetchRecentlyUpdated = async (options: ?PaginationParams): Promise<*> => {
    const data = await this.fetchNamedPage('list', options);

    runInAction('DocumentsStore#fetchRecentlyUpdated', () => {
      // $FlowFixMe
      this.recentlyUpdatedIds.replace(
        uniq(this.recentlyUpdatedIds.concat(map(data, 'id')))
      );
    });
    return data;
  };

  @action
  fetchRecentlyViewed = async (options: ?PaginationParams): Promise<*> => {
    const data = await this.fetchNamedPage('viewed', options);

    runInAction('DocumentsStore#fetchRecentlyViewed', () => {
      // $FlowFixMe
      this.recentlyViewedIds.replace(
        uniq(this.recentlyViewedIds.concat(map(data, 'id')))
      );
    });
    return data;
  };

  @action
  fetchStarred = (options: ?PaginationParams): Promise<*> => {
    return this.fetchNamedPage('starred', options);
  };

  @action
  fetchDrafts = (options: ?PaginationParams): Promise<*> => {
    return this.fetchNamedPage('drafts', options);
  };

  @action
  fetchPinned = (options: ?PaginationParams): Promise<*> => {
    return this.fetchNamedPage('pinned', options);
  };

  @action
  fetchOwned = (options: ?PaginationParams): Promise<*> => {
    return this.fetchNamedPage('list', options);
  };

  @action
  search = async (
    query: string,
    options: ?PaginationParams
  ): Promise<SearchResult[]> => {
    const res = await client.get('/documents.search', {
      ...options,
      query,
    });
    invariant(res && res.data, 'Search API response should be available');
    const { data } = res;
    data.forEach(result => this.add(result.document));
    return data;
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
    } catch (_err) {
      if (!options.prefetch && navigator.onLine) {
        this.ui.showToast('Failed to load document');
      }
    } finally {
      this.isFetching = false;
    }
  };

  @action
  duplicate = async (document: Document): * => {
    const res = await client.post('/documents.create', {
      publish: true,
      parentDocument: document.parentDocumentId,
      collection: document.collection.id,
      title: `${document.title} (duplicate)`,
      text: document.text,
    });

    if (res && res.data) {
      const duped = res.data;
      this.emit('documents.create', new Document(duped));
      this.emit('documents.publish', {
        id: duped.id,
        collectionId: duped.collection.id,
      });
      return duped;
    }
  };

  getByUrl = (url: string): ?Document => {
    return find(this.data.values(), doc => url.endsWith(doc.urlId));
  };
}

export default DocumentsStore;
