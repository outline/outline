// @flow
import { observable, action, runInAction } from 'mobx';
import invariant from 'invariant';
import { client } from 'utils/ApiClient';
import type { Document } from 'types';

class RecentDocumentsStore {
  @observable documents: Array<Document> = [];
  @observable isFetching = false;

  @action fetchDocuments = async () => {
    this.isFetching = true;

    try {
      const res = await client.get('/documents.viewed');
      invariant(res && res.data, 'res or res.data missing');
      const { data } = res;
      runInAction('update state after fetching data', () => {
        this.documents = data;
      });
    } catch (e) {
      console.error('Something went wrong');
    }

    this.isFetching = false;
  };
}

export default RecentDocumentsStore;
