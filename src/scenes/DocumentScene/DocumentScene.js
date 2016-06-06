import React from 'react';
import { Link } from 'react-router';
import { observer } from 'mobx-react';

import store from './DocumentSceneStore';

import Layout, { HeaderAction } from 'components/Layout';
import AtlasPreviewLoading from 'components/AtlasPreviewLoading';
import CenteredContent from 'components/CenteredContent';
import Document from 'components/Document';
import DropdownMenu, { MenuItem } from 'components/DropdownMenu';

import styles from './DocumentScene.scss';

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

  render() {
    const doc = store.document;
    let title;
    let titleText;
    let actions;
    if (doc) {
      actions = (
        <div className={ styles.actions }>
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
        <CenteredContent>
          { store.isFetching ? (
            <AtlasPreviewLoading />
          ) : (
            <Document document={ doc } />
          ) }
        </CenteredContent>
      </Layout>
    );
  }
};

export default DocumentScene;
