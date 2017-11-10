// @flow
import { observable, action } from 'mobx';
import invariant from 'invariant';
import { client } from 'utils/ApiClient';
import type { User } from 'types';

type View = {
  user: User,
  count: number,
};

class DocumentViewersStore {
  documentId: string;
  @observable viewers: Array<View>;
  @observable isFetching: boolean;

  @action
  fetchViewers = async () => {
    this.isFetching = true;

    try {
      const res = await client.post(
        '/views.list',
        {
          id: this.documentId,
        },
        { cache: true }
      );
      invariant(res && res.data, 'Data should be available');
      this.viewers = res.data.users;
    } catch (e) {
      console.error('Something went wrong');
    }
    this.isFetching = false;
  };

  constructor(documentId: string) {
    this.documentId = documentId;
  }
}

export default DocumentViewersStore;
