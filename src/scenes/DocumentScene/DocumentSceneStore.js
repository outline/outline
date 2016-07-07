import _isEqual from 'lodash/isEqual';
import { observable, action, computed, runInAction, toJS } from 'mobx';
import { client } from 'utils/ApiClient';
import { browserHistory } from 'react-router';

class DocumentSceneStore {
  @observable document;

  @observable isFetching = true;
  @observable updatingContent = false;
  @observable updatingStructure = false;
  @observable isDeleting;

  /* Computed */

  @computed get isAtlas() {
    return this.document &&
      this.document.atlas.type === 'atlas';
  }

  /* Actions */

  @action fetchDocument = async (id, softLoad) => {
    this.isFetching = !softLoad;
    this.updatingContent = softLoad;

    try {
      const res = await client.post('/documents.info', { id: id });
      const { data } = res;
      runInAction('fetchDocument', () => {
        this.document = data;
      });
    } catch (e) {
      console.error("Something went wrong");
    }
    this.isFetching = false;
    this.updatingContent = false;
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

  @action updateNavigationTree = async (tree) => {
    // Only update when tree changes
    if (_isEqual(toJS(tree), toJS(this.document.atlas.navigationTree))) {
      return true;
    }

    this.updatingStructure = true;

    try {
      const res = await client.post('/atlases.updateNavigationTree', {
        id: this.document.atlas.id,
        tree: tree,
      });
      runInAction('updateNavigationTree', () => {
        const { data } = res;
        this.document.atlas = data;
      });
    } catch (e) {
      console.error("Something went wrong");
    }
    this.updatingStructure = false;
  }
};

export default DocumentSceneStore;
