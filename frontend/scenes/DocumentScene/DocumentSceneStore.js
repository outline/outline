import _ from 'lodash';
import { observable, action, computed, runInAction, toJS, autorunAsync } from 'mobx';
import { client } from 'utils/ApiClient';
import { browserHistory } from 'react-router';

const DOCUMENT_PREFERENCES = 'DOCUMENT_PREFERENCES';

class DocumentSceneStore {
  static cache;

  @observable document;
  @observable collapsedNodes = [];

  @observable isFetching = true;
  @observable updatingContent = false;
  @observable updatingStructure = false;
  @observable isDeleting;

  /* Computed */

  @computed get isCollection() {
    return this.document &&
      this.document.collection.type === 'atlas';
  }

  @computed get collectionTree() {
    if (!this.document || this.document.collection.type !== 'atlas') return;
    const tree = this.document.collection.navigationTree;

    const collapseNodes = (node) => {
      if (this.collapsedNodes.includes(node.id)) {
        node.collapsed = true;
      }
      node.children = node.children.map(childNode => {
        return collapseNodes(childNode);
      });

      return node;
    };

    return collapseNodes(toJS(tree));
  }

  /* Actions */

  @action fetchDocument = async (id, softLoad = false) => {
    let cacheHit = false;
    runInAction('retrieve document from cache', () => {
      const cachedValue = this.cache.fetchFromCache(id);
      cacheHit = !!cachedValue;
      if (cacheHit) this.document = cachedValue;
    });

    this.isFetching = !softLoad;
    this.updatingContent = softLoad && !cacheHit;

    try {
      const res = await client.get('/documents.info', { id }, { cache: true });
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
      await client.post('/documents.delete', { id: this.document.id });
      browserHistory.push(this.document.collection.url);
    } catch (e) {
      console.error("Something went wrong");
    }
    this.isFetching = false;
  }

  @action updateNavigationTree = async (tree) => {
    // Only update when tree changes
    if (_.isEqual(toJS(tree), toJS(this.document.collection.navigationTree))) {
      return true;
    }

    this.updatingStructure = true;

    try {
      const res = await client.post('/collections.updateNavigationTree', {
        id: this.document.collection.id,
        tree,
      });
      runInAction('updateNavigationTree', () => {
        const { data } = res;
        this.document.collection = data;
      });
    } catch (e) {
      console.error("Something went wrong");
    }
    this.updatingStructure = false;
  }

  @action onNodeCollapse = (nodeId, collapsed) => {
    if (_.indexOf(this.collapsedNodes, nodeId) >= 0) {
      this.collapsedNodes = _.without(this.collapsedNodes, nodeId);
    } else {
      this.collapsedNodes.push(nodeId);
    }
  }

  // General

  persistSettings = () => {
    localStorage[DOCUMENT_PREFERENCES] = JSON.stringify({
      collapsedNodes: toJS(this.collapsedNodes),
    });
  }

  constructor(settings, options) {
    // Rehydrate settings
    this.collapsedNodes = settings.collapsedNodes || [];
    this.cache = options.cache;

    // Persist settings to localStorage
    // TODO: This could be done more selectively
    autorunAsync(() => {
      this.persistSettings();
    });
  }
}

export default DocumentSceneStore;
export {
  DOCUMENT_PREFERENCES,
};
