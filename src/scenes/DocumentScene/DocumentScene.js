import React from 'react';
import { toJS } from 'mobx';
import { Link, browserHistory } from 'react-router';
import { observer } from 'mobx-react';

import DocumentSceneStore, {
  DOCUMENT_PREFERENCES
} from './DocumentSceneStore';

import Layout, { HeaderAction } from 'components/Layout';
import AtlasPreviewLoading from 'components/AtlasPreviewLoading';
import CenteredContent from 'components/CenteredContent';
import Document from 'components/Document';
import DropdownMenu, { MenuItem, MoreIcon } from 'components/DropdownMenu';
import Flex from 'components/Flex';
import Tree from 'components/Tree';

import styles from './DocumentScene.scss';
import classNames from 'classnames/bind';
const cx = classNames.bind(styles);

import treeStyles from 'components/Tree/Tree.scss';

@observer
class DocumentScene extends React.Component {
  static store;

  state = {
    didScroll: false,
    showSidebar: true,
  }

  constructor(props) {
    super(props);
    this.store = new DocumentSceneStore(JSON.parse(localStorage[DOCUMENT_PREFERENCES] || "{}"));
  }

  componentDidMount = () => {
    const { id } = this.props.routeParams;
    this.store.fetchDocument(id);
  }

  componentWillReceiveProps = (nextProps) => {
    // Reload on url change
    const oldId = this.props.params.id;
    const newId = nextProps.params.id;
    if (oldId !== newId) {
      this.store.fetchDocument(newId, true);
    }

    // Scroll to anchor after loading, and only once
    const { hash } = this.props.location;

    if (nextProps.doc && hash && !this.state.didScroll) {
      const name = hash.split('#')[1];
      setTimeout(() => {
        this.setState({ didScroll: true });
        const element = doc.getElementsByName(name)[0];
        if (element) element.scrollIntoView()
      }, 0);
    }
  }

  onEdit = () => {
    const url = `/documents/${this.store.document.id}/edit`;
    browserHistory.push(url);
  }

  onCreate = () => {
    const url = `/documents/${this.store.document.id}/new`;
    browserHistory.push(url);
  }

  onDelete = () => {
    let msg;
    if (this.store.document.atlas.type === 'atlas') {
      msg = 'Are you sure you want to delete this document and all it\'s child documents (if any)?'
    } else {
      msg = "Are you sure you want to delete this document?";
    }

    if (confirm(msg)) {
      this.store.deleteDocument();
    };
  }

  toggleSidebar = () => {
    this.setState({ showSidebar: !this.state.showSidebar });
  }

  renderNode = (node) => {
    return (
      <span className={ treeStyles.nodeLabel } onClick={this.onClickNode.bind(null, node)}>
        {node.module.name}
      </span>
    );
  }

  render() {
    const doc = this.store.document;
    const allowDelete = doc && doc.atlas.type === 'atlas' &&
      doc.id !== doc.atlas.navigationTree.id;
    let title;
    let titleText;
    let actions;
    if (doc) {
      actions = (
        <div className={ styles.actions }>
          <DropdownMenu label={ <MoreIcon /> }>
            { this.store.isAtlas && <MenuItem onClick={ this.onCreate }>New document</MenuItem> }
            <MenuItem onClick={ this.onEdit }>Edit</MenuItem>
            { allowDelete && <MenuItem onClick={ this.onDelete }>Delete</MenuItem> }
          </DropdownMenu>
        </div>
      );
      title = (
        <span>
          <Link to={ `/atlas/${doc.atlas.id}` }>{doc.atlas.name}</Link>
          { ` / ${doc.title}` }
        </span>
      );
      titleText = `${doc.atlas.name} - ${doc.title}`;
    }

    return (
      <Layout
        title={ title }
        titleText={ titleText }
        actions={ actions }
        loading={ this.store.updatingStructure }
      >
        { this.store.isFetching ? (
          <CenteredContent>
            <AtlasPreviewLoading />
          </CenteredContent>
        ) : (
          <Flex flex={ true }>
            { this.store.isAtlas && this.state.showSidebar ? (
              <div className={ styles.sidebar }>
                <Tree
                  paddingLeft={ 10 }
                  tree={ toJS(this.store.atlasTree) }
                  onChange={ this.store.updateNavigationTree  }
                  onCollapse={ this.store.onNodeCollapse }
                  isNodeCollapsed={ this.isNodeCollapsed }
                  renderNode={ this.renderNode }
                />
              </div>
            ) : null }
            <Flex flex={ true } justify={ 'center' } className={ styles.content}>
              <img
                src={ require("assets/icons/menu.svg") }
                className={ styles.menuIcon }
                onClick={ this.toggleSidebar }
              />
              <CenteredContent>
                { this.store.updatingContent ? (
                  <AtlasPreviewLoading />
                ) : (
                  <Document document={ doc } />
                ) }
              </CenteredContent>
            </Flex>
          </Flex>
        ) }
      </Layout>
    );
  }
};

export default DocumentScene;
