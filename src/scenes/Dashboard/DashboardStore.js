import { observable, action } from 'mobx';
import { client } from 'utils/ApiClient';

const store = new class DashboardStore {
  @observable atlases = [];
  @observable pagination;

  @observable isFetching = true;

  /* Actions */

  @action fetchAtlases = async (teamId) => {
    this.isFetching = true;

    try {
      const res = await client.post('/atlases.list', { id: teamId });
      const { data, pagination } = res;
      this.atlases = data;
      this.pagination = pagination;
    } catch (e) {
      console.error("Something went wrong");
    }
    this.isFetching = false;
  }
}();

export default store;