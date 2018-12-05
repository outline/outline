// @flow
import { observable, action, computed, runInAction } from 'mobx';
import { without, map, find, orderBy, filter, compact, uniq } from 'lodash';
import { client } from 'utils/ApiClient';
import naturalSort from 'shared/utils/naturalSort';
import invariant from 'invariant';

import BaseStore from 'stores/BaseStore';
import RootStore from 'stores/RootStore';
import Document from '../models/Document';
import Revision from '../models/Revision';
import type { FetchOptions, PaginationParams, SearchResult } from 'types';

export default class DocumentsStore extends BaseStore<Document> {
  @observable recentlyViewedIds: string[] = [];
  @observable recentlyUpdatedIds: string[] = [];

  constructor(rootStore: RootStore) {
    super(rootStore, Document);
  }

  @computed
  get recentlyViewed(): * {
    return orderBy(
      compact(this.recentlyViewedIds.map(id => this.data.get(id))),
      'updatedAt',
      'desc'
    );
  }

  @computed
  get recentlyUpdated(): * {
    return orderBy(
      compact(this.recentlyUpdatedIds.map(id => this.data.get(id))),
      'updatedAt',
      'desc'
    );
  }

  createdByUser(userId: string): * {
    return orderBy(
      filter(
        Array.from(this.data.values()),
        document => document.createdBy.id === userId
      ),
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
        Array.from(this.data.values()),
        document =>
          document.collectionId === collectionId && !!document.publishedAt
      ),
      'updatedAt',
      'desc'
    );
  }

  @computed
  get starred(): Document[] {
    return filter(this.orderedData, d => d.starred);
  }

  @computed
  get starredAlphabetical(): Document[] {
    return naturalSort(this.starred, 'title');
  }

  @computed
  get drafts(): Document[] {
    return filter(
      orderBy(Array.from(this.data.values()), 'updatedAt', 'desc'),
      doc => !doc.publishedAt
    );
  }

  @computed
  get active(): ?Document {
    return this.rootStore.ui.activeDocumentId
      ? this.data.get(this.rootStore.ui.activeDocumentId)
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
        data.forEach(this.add);
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
  prefetchDocument = (id: string) => {
    if (!this.data.get(id)) {
      return this.fetch(id, { prefetch: true });
    }
  };

  @action
  fetch = async (
    id: string,
    options?: FetchOptions = {}
  ): Promise<?Document> => {
    if (!options.prefetch) this.isFetching = true;

    try {
      const doc: ?Document = this.data.get(id) || this.getByUrl(id);
      if (doc) return doc;

      const res = await client.post('/documents.info', {
        id,
        shareId: options.shareId,
      });
      invariant(res && res.data, 'Document not available');
      this.add(res.data);

      runInAction('DocumentsStore#fetch', () => {
        this.isLoaded = true;
      });

      return this.data.get(res.data.id);
    } finally {
      this.isFetching = false;
    }
  };

  @action
  move = async (document: Document, parentDocumentId: ?string) => {
    const res = await client.post('/documents.move', {
      id: document.id,
      parentDocument: parentDocumentId,
    });
    invariant(res && res.data, 'Data not available');

    const collection = this.getCollectionForDocument(document);
    if (collection) collection.refresh();

    return this.add(res.data);
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
    invariant(res && res.data, 'Data should be available');

    const collection = this.getCollectionForDocument(document);
    if (collection) collection.refresh();

    return this.add(res.data);
  };

  async update(params: *) {
    const document = await super.update(params);

    // Because the collection object contains the url and title
    // we need to ensure they are updated there as well.
    const collection = this.getCollectionForDocument(document);
    if (collection) collection.updateDocument(document);
    return document;
  }

  async delete(document: Document) {
    await super.delete(document);

    runInAction(() => {
      this.recentlyViewedIds = without(this.recentlyViewedIds, document.id);
      this.recentlyUpdatedIds = without(this.recentlyUpdatedIds, document.id);
    });

    const collection = this.getCollectionForDocument(document);
    if (collection) collection.refresh();
  }

  @action
  restore = async (document: Document, revision: Revision) => {
    const res = await client.post('/documents.restore', {
      id: document.id,
      revisionId: revision.id,
    });
    runInAction('Document#restore', () => {
      invariant(res && res.data, 'Data should be available');
      document.updateFromJson(res.data);
    });
  };

  pin = (document: Document) => {
    return client.post('/documents.pin', { id: document.id });
  };

  unpin = (document: Document) => {
    return client.post('/documents.unpin', { id: document.id });
  };

  star = (document: Document) => {
    return client.post('/documents.star', { id: document.id });
  };

  unstar = (document: Document) => {
    return client.post('/documents.unstar', { id: document.id });
  };

  getByUrl = (url: string): ?Document => {
    return find(Array.from(this.data.values()), doc => url.endsWith(doc.urlId));
  };

  getCollectionForDocument(document: Document) {
    return this.rootStore.collections.data.get(document.collectionId);
  }
}
