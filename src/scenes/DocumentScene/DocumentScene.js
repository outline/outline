import React from 'react';
import { toJS } from 'mobx';
import _isEqual from 'lodash/isEqual';
import { Link } from 'react-router';
import { observer } from 'mobx-react';

import store from './DocumentSceneStore';

import Layout, { HeaderAction } from 'components/Layout';
import AtlasPreviewLoading from 'components/AtlasPreviewLoading';
import CenteredContent from 'components/CenteredContent';
import Document from 'components/Document';
import DropdownMenu, { MenuItem } from 'components/DropdownMenu';
import Flex from 'components/Flex';
import Tree from 'components/Tree';

import styles from './DocumentScene.scss';
import classNames from 'classnames/bind';
const cx = classNames.bind(styles);

import treeStyles from 'components/Tree/Tree.scss';

@observer
class DocumentScene extends React.Component {
  state = {
    didScroll: false,
  }

  componentDidMount = () => {
    const { id } = this.props.routeParams;
    store.fetchDocument(id);
  }

  componentWillReceiveProps = (nextProps) => {
    // Reload on url change
    const oldId = this.props.params.id;
    const newId = nextProps.params.id;
    if (oldId !== newId) {
      store.fetchDocument(newId);
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

  onDelete = () => {
    if (confirm("Are you sure you want to delete this document?")) {
      store.deleteDocument();
    };
  }

  renderNode = (node) => {
    return (
      <span className={ treeStyles.nodeLabel } onClick={this.onClickNode.bind(null, node)}>
        {node.module.name}
      </span>
    );
  }

  handleChange = (tree) => {
    // Only update when tree changes, otherwise link clicks toggle tree handleChanges changes
    if (!_isEqual(toJS(tree), toJS(store.document.atlas.navigationTree))) {
      store.updateNavigationTree(tree);
    }
  }

  render() {
    const doc = store.document;
    let title;
    let titleText;
    let actions;
    if (doc) {
      actions = (
        <div className={ styles.actions }>
          { store.isAtlas ? (
            <HeaderAction>
              <Link to={ `/documents/${doc.id}/new` }>New document</Link>
            </HeaderAction>
          ) : null }
          <HeaderAction>
            <Link to={ `/documents/${doc.id}/edit` }>Edit</Link>
          </HeaderAction>
          <DropdownMenu label="More">
            <MenuItem onClick={ this.onDelete }>Delete</MenuItem>
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
      >
        { store.isFetching ? (
          <CenteredContent>
            <AtlasPreviewLoading />
          </CenteredContent>
        ) : (
          <Flex flex={ true }>
            { store.isAtlas ? (
              <div className={ styles.sidebar }>
                <Tree
                  paddingLeft={10}
                  tree={ toJS(doc.atlas.navigationTree) }
                  onChange={this.handleChange}
                  isNodeCollapsed={this.isNodeCollapsed}
                  renderNode={this.renderNode}
                />
              </div>
            ) : null }
            <Flex flex={ true } justify={ 'center' }>
              <CenteredContent>
                <Document document={ doc } />
              </CenteredContent>
            </Flex>
          </Flex>
        ) }
      </Layout>
    );
  }
};

export default DocumentScene;
