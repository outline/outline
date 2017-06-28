// @flow
import { observable, action, runInAction } from 'mobx';
import { client } from 'utils/ApiClient';
import _ from 'lodash';
import invariant from 'invariant';

import stores from 'stores';
import Document from 'models/Document';
import ErrorsStore from 'stores/ErrorsStore';

type Options = {
  teamId: string,
};

class DocumentsStore {
  @observable data: Object = {};
  @observable isLoaded: boolean = false;
  errors: ErrorsStore;

  /* Actions */

  @action fetchAll = async (): Promise<*> => {
    try {
      const res = await client.post('/documents.list');
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
    } catch (e) {
      this.errors.add('Failed to load documents');
    }
  };

  @action fetch = async (id: string): Promise<*> => {
    try {
      const res = await client.post('/documents.info', { id });
      invariant(res && res.data, 'Document not available');
      const { data } = res;
      runInAction('DocumentsStore#fetch', () => {
        this.update(new Document(data));
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

  @action update = (document: Document): void => {
    const existing = this.data[document.id];

    this.data[document.id] = {
      ...existing,
      document,
    };
  };

  getById = (id: string): Document => {
    return _.find(this.data, { id });
  };

  constructor(options: Options) {
    this.errors = stores.errors;
  }
}

export default DocumentsStore;
