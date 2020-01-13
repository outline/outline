// @flow
import BaseStore from './BaseStore';
import RootStore from './RootStore';
import Group from 'models/Group';
import { client } from 'utils/ApiClient';
import invariant from 'invariant';
import { action, runInAction } from 'mobx';
import type { PaginationParams } from 'types';

export default class GroupsStore extends BaseStore<Group> {
  constructor(rootStore: RootStore) {
    super(rootStore, Group);
  }

  @action
  fetchPage = async (params: ?PaginationParams): Promise<*> => {
    this.isFetching = true;

    try {
      const res = await client.post(`/groups.list`, params);

      invariant(res && res.data, 'Data not available');

      runInAction(`/groups.list`, () => {
        res.data.groups.forEach(this.add);
        res.data.groupMemberships.forEach(this.rootStore.groupMemberships.add);
        this.isLoaded = true;
      });
      return res.data.groups;
    } finally {
      this.isFetching = false;
    }
  };
}
