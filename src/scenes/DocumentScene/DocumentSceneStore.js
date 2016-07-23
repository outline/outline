import _isEqual from 'lodash/isEqual';
import _indexOf from 'lodash/indexOf';
import _without from 'lodash/without';
import { observable, action, computed, runInAction, toJS, autorun } from 'mobx';
import { client } from 'utils/ApiClient';
import { browserHistory } from 'react-router';

const DOCUMENT_PREFERENCES = 'DOCUMENT_PREFERENCES';

class DocumentSceneStore {
  @observable document;
  @observable collapsedNodes = [];

  @observable isFetching = true;
  @observable updatingContent = false;
  @observable updatingStructure = false;
  @observable isDeleting;

  /* Computed */

  @computed get isAtlas() {
    return this.document &&
      this.document.atlas.type === 'atlas';
  }

  @computed get atlasTree() {
    if (this.document.atlas.type !== 'atlas') return;
    let tree = this.document.atlas.navigationTree;

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

  @action fetchDocument = async (id, softLoad) => {
    this.isFetching = !softLoad;
    this.updatingContent = softLoad;

    try {
      const res = await client.get('/documents.info', { id: id });
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

  constructor(settings) {
    // Rehydrate settings
    this.collapsedNodes = settings.collapsedNodes || [];

    // Persist settings to localStorage
    // TODO: This could be done more selectively
    autorun(() => {
      this.persistSettings();
    });
  }
};

export default DocumentSceneStore;
export {
  DOCUMENT_PREFERENCES,
};
