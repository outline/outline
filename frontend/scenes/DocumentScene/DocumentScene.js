import React, { PropTypes } from 'react';
import { Link, browserHistory } from 'react-router';
import { observer, inject } from 'mobx-react';
import { toJS } from 'mobx';
import keydown from 'react-keydown';
import _ from 'lodash';

import DocumentSceneStore, { DOCUMENT_PREFERENCES } from './DocumentSceneStore';

import Layout from 'components/Layout';
import AtlasPreviewLoading from 'components/AtlasPreviewLoading';
import CenteredContent from 'components/CenteredContent';
import Document from 'components/Document';
import DropdownMenu, { MenuItem, MoreIcon } from 'components/DropdownMenu';
import { Flex } from 'reflexbox';
import Sidebar from './components/Sidebar';

import styles from './DocumentScene.scss';
// import classNames from 'classnames/bind';
// const cx = classNames.bind(styles);

@keydown(['cmd+/', 'ctrl+/', 'c', 'e'])
@inject('ui', 'cache')
@observer
class DocumentScene extends React.Component {
  static propTypes = {
    ui: PropTypes.object.isRequired,
    cache: PropTypes.object.isRequired,
    routeParams: PropTypes.object,
    params: PropTypes.object.isRequired,
    location: PropTypes.object.isRequired,
  };

  constructor(props) {
    super(props);
    this.store = new DocumentSceneStore(
      JSON.parse(localStorage[DOCUMENT_PREFERENCES] || '{}'),
      {
        cache: this.props.cache,
      }
    );
  }

  state = {
    didScroll: false,
  };

  componentDidMount = async () => {
    const { id } = this.props.routeParams;
    await this.store.fetchDocument(id, {
      replaceUrl: !this.props.location.hash,
    });
    this.scrollTohash();
  };

  componentWillReceiveProps = async nextProps => {
    const key = nextProps.keydown.event;
    if (key) {
      if (key.key === '/' && (key.metaKey || key.ctrl.Key)) {
        this.props.ui.toggleSidebar();
      }

      if (key.key === 'c') {
        _.defer(this.onCreate);
      }

      if (key.key === 'e') {
        _.defer(this.onEdit);
      }
    }

    // Reload on url change
    const oldId = this.props.params.id;
    const newId = nextProps.params.id;
    if (oldId !== newId) {
      await this.store.fetchDocument(newId, {
        softLoad: true,
        replaceUrl: !this.props.location.hash,
      });
    }

    this.scrollTohash();
  };

  onEdit = () => {
    const url = `${this.store.document.url}/edit`;
    browserHistory.push(url);
  };

  onCreateDocument = () => {
    browserHistory.push(`${this.store.collectionTree.url}/new`);
  };

  onCreateChild = () => {
    browserHistory.push(`${this.store.document.url}/new`);
  };

  onDelete = () => {
    let msg;
    if (this.store.document.collection.type === 'atlas') {
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
    const a = document.createElement('a');
    a.textContent = 'download';
    a.download = `${doc.title}.md`;
    a.href = `data:text/markdown;charset=UTF-8,${encodeURIComponent(doc.text)}`;
    a.click();
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

  render() {
    const { sidebar } = this.props.ui;

    const doc = this.store.document;
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
      title = (
        <span>
          &nbsp;/&nbsp;
          <Link to={doc.collection.url}>{doc.collection.name}</Link>
          {` / ${doc.title}`}
        </span>
      );
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
