// @flow
import _ from 'lodash';
import { browserHistory } from 'react-router';
import invariant from 'invariant';
import {
  observable,
  action,
  computed,
  runInAction,
  toJS,
  autorunAsync,
} from 'mobx';
import { client } from 'utils/ApiClient';
import type {
  Document as DocumentType,
  Collection,
  NavigationNode,
} from 'types';

const DOCUMENT_PREFERENCES = 'DOCUMENT_PREFERENCES';

type Document = {
  collection: Collection,
} & DocumentType;

class DocumentSceneStore {
  @observable document: ?Document;
  @observable collapsedNodes: string[] = [];

  @observable isFetching: boolean = true;
  @observable updatingContent: boolean = false;
  @observable updatingStructure: boolean = false;
  @observable isDeleting: boolean = false;

  /* Computed */

  @computed get isCollection(): boolean {
    return !!this.document && this.document.collection.type === 'atlas';
  }

  @computed get collectionTree(): ?Object {
    if (
      this.document &&
      this.document.collection &&
      this.document.collection.type === 'atlas'
    ) {
      const tree = this.document.collection.navigationTree;
      const collapseNodes = node => {
        node.collapsed = this.collapsedNodes.includes(node.id);
        node.children = node.children.map(childNode => {
          return collapseNodes(childNode);
        });

        return node;
      };

      return collapseNodes(toJS(tree));
    }
  }

  @computed get pathToDocument(): ?Array<NavigationNode> {
    let path;
    const traveler = (node, previousPath) => {
      if (this.document && node.id === this.document.id) {
        path = previousPath;
        return;
      } else {
        node.children.forEach(childNode => {
          const newPath = [...previousPath, node];
          return traveler(childNode, newPath);
        });
      }
    };

    if (this.document && this.collectionTree) {
      traveler(this.collectionTree, []);
      invariant(path, 'Path is not available for collection, abort');
      return path.splice(1);
    }
  }

  /* Actions */

  @action fetchDocument = async (
    id: string,
    options: { softLoad?: boolean, replaceUrl?: boolean } = {}
  ) => {
    options = {
      softLoad: false,
      replaceUrl: true,
      ...options,
    };

    this.isFetching = !options.softLoad;
    this.updatingContent = true;

    try {
      const res = await client.get('/documents.info', { id });
      invariant(res && res.data, 'data should be available');
      const { data } = res;
      runInAction('fetchDocument', () => {
        this.document = data;
        if (options.replaceUrl) browserHistory.replace(data.url);
      });
    } catch (e) {
      console.error('Something went wrong');
    }
    this.isFetching = false;
    this.updatingContent = false;
  };

  @action deleteDocument = async () => {
    if (!this.document) return;
    this.isFetching = true;

    try {
      await client.post('/documents.delete', { id: this.document.id });
      // $FlowFixMe don't be stupid
      browserHistory.push(this.document.collection.url);
    } catch (e) {
      console.error('Something went wrong');
    }
    this.isFetching = false;
  };

  @action updateNavigationTree = async (tree: Object) => {
    // Only update when tree changes
    // $FlowFixMe don't be stupid
    if (_.isEqual(toJS(tree), toJS(this.document.collection.navigationTree))) {
      return true;
    }

    this.updatingStructure = true;

    try {
      const res = await client.post('/collections.updateNavigationTree', {
        // $FlowFixMe don't be stupid
        id: this.document.collection.id,
        tree,
      });
      invariant(res && res.data, 'data should be available');
      runInAction('updateNavigationTree', () => {
        const { data } = res;
        // $FlowFixMe don't be stupid
        this.document.collection = data;
      });
    } catch (e) {
      console.error('Something went wrong');
    }
    this.updatingStructure = false;
  };

  @action onNodeCollapse = (nodeId: string) => {
    if (_.indexOf(this.collapsedNodes, nodeId) >= 0) {
      this.collapsedNodes = _.without(this.collapsedNodes, nodeId);
    } else {
      this.collapsedNodes.push(nodeId);
    }
  };

  // General

  persistSettings = () => {
    localStorage[DOCUMENT_PREFERENCES] = JSON.stringify({
      collapsedNodes: toJS(this.collapsedNodes),
    });
  };

  constructor(settings: { collapsedNodes: string[] }) {
    // Rehydrate settings
    this.collapsedNodes = settings.collapsedNodes || [];

    // Persist settings to localStorage
    // TODO: This could be done more selectively
    autorunAsync(() => {
      this.persistSettings();
    });
  }
}

export default DocumentSceneStore;
export { DOCUMENT_PREFERENCES };
