import { observable, action, computed } from 'mobx';
import { client } from 'utils/ApiClient';
import { browserHistory } from 'react-router';

const store = new class DocumentSceneStore {
  @observable document;

  @observable isFetching = true;
  @observable isDeleting;

  /* Computed */

  @computed get isAtlas() {
    console.log(this.document.atlas.type)
    return this.document.atlas.type === 'atlas';
  }

  /* Actions */

  @action fetchDocument = async (id) => {
    this.isFetching = true;
    this.document = null;

    try {
      const res = await client.post('/documents.info', { id: id });
      const { data } = res;
      this.document = data;
    } catch (e) {
      console.error("Something went wrong");
    }
    this.isFetching = false;
  }

  @action deleteDocument = async () => {
    this.isFetching = true;

    try {
      const res = await client.post('/documents.delete', { id: this.document.id });
      browserHistory.push(`/atlas/${this.document.atlas.id}`);
    } catch (e) {
      console.error("Something went wrong");
    }
    this.isFetching = false;
  }
}();

export default store;