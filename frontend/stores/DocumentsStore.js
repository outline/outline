// @flow
import { observable, action, runInAction } from 'mobx';
import { client } from 'utils/ApiClient';
import _ from 'lodash';
import invariant from 'invariant';

import stores from 'stores';
import Document from 'models/Document';
import ErrorsStore from 'stores/ErrorsStore';

class DocumentsStore {
  @observable data: Object = {};
  @observable isLoaded: boolean = false;
  errors: ErrorsStore;

  /* Actions */

  @action fetchAll = async (request?: string = 'list'): Promise<*> => {
    try {
      const res = await client.post(`/documents.${request}`);
      invariant(res && res.data, 'Document list not available');
      const { data } = res;
      runInAction('DocumentsStore#fetchAll', () => {
        const loaded = _.keyBy(
          data.map(document => new Document(document)),
          'id'
        );
        this.data = {
          ...this.data,
          ...loaded,
        };
        this.isLoaded = true;
      });
      return data;
    } catch (e) {
      this.errors.add('Failed to load documents');
    }
  };

  @action fetchRecent = async (): Promise<*> => {
    const data = await this.fetchAll('recent');
    console.log(data);
  };

  @action fetchViewed = async (): Promise<*> => {
    const data = await this.fetchAll('viewed');
    console.log(data);
  };

  @action fetch = async (id: string): Promise<*> => {
    try {
      const res = await client.post('/documents.info', { id });
      invariant(res && res.data, 'Document not available');
      const { data } = res;
      runInAction('DocumentsStore#fetch', () => {
        this.add(new Document(data));
        this.isLoaded = true;
      });
    } catch (e) {
      this.errors.add('Failed to load documents');
    }
  };

  @action add = (document: Document): void => {
    this.data[document.id] = document;
  };

  @action remove = (id: string): void => {
    delete this.data[id];
  };

  getById = (id: string): Document => {
    return _.find(this.data, { id });
  };

  constructor() {
    this.errors = stores.errors;
  }
}

export default DocumentsStore;
