import _isEqual from 'lodash/isEqual';
import _indexOf from 'lodash/indexOf';
import _without from 'lodash/without';
import { observable, action, computed, runInAction, toJS, autorunAsync } from 'mobx';
import { client } from 'utils/ApiClient';
import { browserHistory } from 'react-router';

const DOCUMENT_PREFERENCES = 'DOCUMENT_PREFERENCES';

class DocumentSceneStore {
  static cache;

  @observable document;
  @observable collapsedNodes = [];

  @observable isFetching;
  @observable updatingContent = false;
  @observable updatingStructure = false;
  @observable isDeleting;

  /* Computed */

  @computed get isAtlas() {
    return this.document &&
      this.document.atlas.type === 'atlas';
  }

  @computed get atlasTree() {
    if (!this.document || this.document.atlas.type !== 'atlas') return;
    const tree = this.document.atlas.navigationTree;

    const collapseNodes = (node) => {
      if (this.collapsedNodes.includes(node.id)) {
        node.collapsed = true;
      }
      node.children = node.children.map(childNode => {
        return collapseNodes(childNode);
      })

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
        tree,
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

  @action onNodeCollapse = (nodeId, collapsed) => {
    if (_indexOf(this.collapsedNodes, nodeId) >= 0) {
      this.collapsedNodes = _without(this.collapsedNodes, nodeId);
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
