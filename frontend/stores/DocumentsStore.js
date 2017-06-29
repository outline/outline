// @flow
import { observable, action, ObservableMap, runInAction } from 'mobx';
import { client } from 'utils/ApiClient';
import _ from 'lodash';
import invariant from 'invariant';

import stores from 'stores';
import Document from 'models/Document';
import ErrorsStore from 'stores/ErrorsStore';

class DocumentsStore {
  @observable recentlyViewedIds: Array<string> = [];
  @observable data: Map<string, Document> = new ObservableMap([]);
  @observable isLoaded: boolean = false;
  errors: ErrorsStore;

  /* Actions */

  @action fetchAll = async (request: string = 'list'): Promise<*> => {
    try {
      const res = await client.post(`/documents.${request}`);
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
    }
  };

  @action fetchRecentlyViewed = async (): Promise<*> => {
    const data = await this.fetchAll('viewed');

    runInAction('DocumentsStore#fetchRecentlyViewed', () => {
      this.recentlyViewedIds = _.map(data, 'id');
    });
  };

  @action fetchStarred = async (): Promise<*> => {
    await this.fetchAll('starred');
  };

  @action fetch = async (id: string): Promise<*> => {
    try {
      const res = await client.post('/documents.info', { id });
      invariant(res && res.data, 'Document not available');
      const { data } = res;
      runInAction('DocumentsStore#fetch', () => {
        this.data.set(data.id, new Document(data));
        this.isLoaded = true;
      });
    } catch (e) {
      this.errors.add('Failed to load documents');
    }
  };

  @action add = (document: Document): void => {
    this.data.set(document.id, document);
  };

  @action remove = (id: string): void => {
    this.data.delete(id);
  };

  getStarred = () => {
    return _.filter(this.data.values(), 'starred');
  };

  getRecentlyViewed = () => {
    return _.filter(this.data.values(), ({ id }) =>
      this.recentlyViewedIds.includes(id)
    );
  };

  getById = (id: string): ?Document => {
    return this.data.get(id);
  };

  getByUrl = (url: string): ?Document => {
    return _.find(this.data.values(), { url });
  };

  constructor() {
    this.errors = stores.errors;
  }
}

export default DocumentsStore;
