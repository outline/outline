// @flow
import React, { PropTypes } from 'react';
import invariant from 'invariant';
import { Link, browserHistory } from 'react-router';
import { observer, inject } from 'mobx-react';
import { toJS } from 'mobx';
import keydown from 'react-keydown';
import _ from 'lodash';

import DocumentSceneStore, { DOCUMENT_PREFERENCES } from './DocumentSceneStore';
import UiStore from 'stores/UiStore';

import Layout from 'components/Layout';
import AtlasPreviewLoading from 'components/AtlasPreviewLoading';
import CenteredContent from 'components/CenteredContent';
import Document from 'components/Document';
import DropdownMenu, { MenuItem, MoreIcon } from 'components/DropdownMenu';
import { Flex } from 'reflexbox';
import Sidebar from './components/Sidebar';

import styles from './DocumentScene.scss';

type Props = {
  ui: UiStore,
  routeParams: Object,
  params: Object,
  location: Object,
  keydown: Object,
};

@keydown(['cmd+/', 'ctrl+/', 'c', 'e'])
@inject('ui')
@observer
class DocumentScene extends React.Component {
  store: DocumentSceneStore;
  static propTypes = {
    ui: PropTypes.object.isRequired,
    routeParams: PropTypes.object,
    params: PropTypes.object.isRequired,
    location: PropTypes.object.isRequired,
  };

  constructor(props: Props) {
    super(props);
    this.store = new DocumentSceneStore(
      JSON.parse(localStorage[DOCUMENT_PREFERENCES] || '{}')
    );
  }

  state = {
    didScroll: false,
  };

  componentDidMount = () => {
    const { id } = this.props.routeParams;
    this.store
      .fetchDocument(id, {
        replaceUrl: !this.props.location.hash,
      })
      .then(() => this.scrollTohash());
  };

  componentWillReceiveProps = (nextProps: Props) => {
    const key = nextProps.keydown.event;
    if (key) {
      if (key.key === '/' && (key.metaKey || key.ctrl.Key)) {
        this.props.ui.toggleSidebar();
      }

      if (key.key === 'c') {
        _.defer(this.onCreateDocument);
      }

      if (key.key === 'e') {
        _.defer(this.onEdit);
      }
    }

    // Reload on url change
    const oldId = this.props.params.id;
    const newId = nextProps.params.id;
    if (oldId !== newId) {
      this.store
        .fetchDocument(newId, {
          softLoad: true,
          replaceUrl: !this.props.location.hash,
        })
        .then(() => this.scrollTohash());
    }
  };

  onEdit = () => {
    invariant(this.store.document, 'Document is not available');
    const url = `${this.store.document.url}/edit`;
    browserHistory.push(url);
  };

  onCreateDocument = () => {
    invariant(this.store.collectionTree, 'collectionTree is not available');
    browserHistory.push(`${this.store.collectionTree.url}/new`);
  };

  onCreateChild = () => {
    invariant(this.store.document, 'Document is not available');
    browserHistory.push(`${this.store.document.url}/new`);
  };

  onDelete = () => {
    let msg;
    if (
      this.store.document &&
      this.store.document.collection &&
      this.store.document.collection.type === 'atlas'
    ) {
      msg =
        "Are you sure you want to delete this document and all it's child documents (if any)?";
    } else {
      msg = 'Are you sure you want to delete this document?';
    }

    if (confirm(msg)) {
      this.store.deleteDocument();
    }
  };

  onExport = () => {
    const doc = this.store.document;
    if (doc) {
      const a = document.createElement('a');
      a.textContent = 'download';
      a.download = `${doc.title}.md`;
      a.href = `data:text/markdown;charset=UTF-8,${encodeURIComponent(doc.text)}`;
      a.click();
    }
  };

  scrollTohash = () => {
    // Scroll to anchor after loading, and only once
    const { hash } = this.props.location;

    if (hash && !this.state.didScroll) {
      const name = hash.slice(1);
      this.setState({ didScroll: true });
      const element = window.document.getElementsByName(name)[0];
      if (element) element.scrollIntoView();
    }
  };

  renderLayoutTitle() {
    const { document, pathToDocument } = this.store;
    if (document && document.collection) {
      const titleSections = pathToDocument
        ? pathToDocument.map(node => <Link to={node.url}>{node.title}</Link>)
        : [];
      titleSections.unshift(
        <Link to={document.collection.url}>{document.collection.name}</Link>
      );

      return (
        <span>
          &nbsp;/&nbsp;
          {titleSections.reduce((prev, curr) => [prev, ' / ', curr])}
          {` / ${document.title}`}
        </span>
      );
    }
  }

  render() {
    const { sidebar } = this.props.ui;

    const doc = this.store.document;

    // FIXME: feels ghetto
    if (!doc) return <div />;
    const allowDelete =
      doc &&
      doc.collection.type === 'atlas' &&
      doc.id !== doc.collection.navigationTree.id;
    let title;
    let titleText;
    let actions;
    if (doc) {
      actions = (
        <div className={styles.actions}>
          <DropdownMenu label={<MoreIcon />}>
            {this.store.isCollection &&
              <div className={styles.menuGroup}>
                <MenuItem onClick={this.onCreateDocument}>
                  New document
                </MenuItem>
                <MenuItem onClick={this.onCreateChild}>New child</MenuItem>
              </div>}
            <MenuItem onClick={this.onEdit}>Edit</MenuItem>
            <MenuItem onClick={this.onExport}>Export</MenuItem>
            {allowDelete && <MenuItem onClick={this.onDelete}>Delete</MenuItem>}
          </DropdownMenu>
        </div>
      );

      title = this.renderLayoutTitle();
      titleText = `${doc.collection.name} - ${doc.title}`;
    }

    return (
      <Layout
        title={title}
        titleText={titleText}
        actions={doc && actions}
        loading={this.store.updatingStructure}
      >
        {this.store.isFetching
          ? <CenteredContent>
              <AtlasPreviewLoading />
            </CenteredContent>
          : <Flex auto>
              {this.store.isCollection &&
                <Sidebar
                  open={sidebar}
                  onToggle={this.props.ui.toggleSidebar}
                  navigationTree={toJS(this.store.collectionTree)}
                  onNavigationUpdate={this.store.updateNavigationTree}
                  onNodeCollapse={this.store.onNodeCollapse}
                />}
              <Flex auto justify="center" className={styles.content}>
                <CenteredContent>
                  <Document document={doc} />
                </CenteredContent>
              </Flex>
            </Flex>}
      </Layout>
    );
  }
}

export default DocumentScene;
