import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { browserHistory, withRouter } from 'react-router';
import { Flex } from 'reflexbox';

import DocumentEditStore, { DOCUMENT_EDIT_SETTINGS } from './DocumentEditStore';
import EditorLoader from './components/EditorLoader';
import Layout, { Title, HeaderAction, SaveAction } from 'components/Layout';
import AtlasPreviewLoading from 'components/AtlasPreviewLoading';
import CenteredContent from 'components/CenteredContent';

const DISCARD_CHANGES = `You have unsaved changes.
Are you sure you want to discard them?`;

@withRouter
@observer
class DocumentEdit extends Component {
  static propTypes = {
    route: React.PropTypes.object.isRequired,
    router: React.PropTypes.object.isRequired,
    params: React.PropTypes.object,
  };

  constructor(props) {
    super(props);
    this.store = new DocumentEditStore(
      JSON.parse(localStorage[DOCUMENT_EDIT_SETTINGS] || '{}')
    );
  }

  state = {
    scrollTop: 0,
  };

  componentDidMount = () => {
    if (this.props.route.newDocument) {
      this.store.collectionId = this.props.params.id;
      this.store.newDocument = true;
    } else if (this.props.route.newChildDocument) {
      this.store.documentId = this.props.params.id;
      this.store.newChildDocument = true;
      this.store.fetchDocument();
    } else {
      this.store.documentId = this.props.params.id;
      this.store.newDocument = false;
      this.store.fetchDocument();
    }

    // Load editor async
    EditorLoader().then(({ Editor }) => {
      this.setState({ Editor });
    });

    // Set onLeave hook
    this.props.router.setRouteLeaveHook(this.props.route, () => {
      if (this.store.hasPendingChanges) {
        return confirm(DISCARD_CHANGES);
      }
      return null;
    });
  };

  onSave = (options = {}) => {
    if (this.store.newDocument || this.store.newChildDocument) {
      this.store.saveDocument(options);
    } else {
      this.store.updateDocument(options);
    }
  };

  onCancel = () => {
    browserHistory.goBack();
  };

  onScroll = scrollTop => {
    this.setState({
      scrollTop,
    });
  };

  render() {
    const title = (
      <Title
        truncate={60}
        placeholder={this.store.isFetching ? 'Untitled document' : ''}
      >
        {this.store.title}
      </Title>
    );

    const titleText = this.store.title;
    const isNew =
      this.props.route.newDocument || this.props.route.newChildDocument;

    const actions = (
      <Flex>
        <HeaderAction>
          <SaveAction
            onClick={this.onSave}
            disabled={this.store.isSaving}
            isNew={isNew}
          />
        </HeaderAction>
      </Flex>
    );

    return (
      <Layout
        actions={actions}
        title={title}
        titleText={titleText}
        fixed
        loading={this.store.isSaving || this.store.isUploading}
        search={false}
      >
        {this.store.isFetching || !('Editor' in this.state)
          ? <CenteredContent>
              <AtlasPreviewLoading />
            </CenteredContent>
          : <this.state.Editor
              store={this.store}
              scrollTop={this.state.scrollTop}
              onScroll={this.onScroll}
              onSave={this.onSave}
              onCancel={this.onCancel}
            />}
      </Layout>
    );
  }
}

export default DocumentEdit;
