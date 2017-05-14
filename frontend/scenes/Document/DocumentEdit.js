// @flow
import React, { Component } from 'react';
import { observer } from 'mobx-react';
import { browserHistory, withRouter } from 'react-router';
import { Flex } from 'reflexbox';

import DocumentEditStore from './DocumentEditStore';
import Editor from './components/Editor';
import Layout, { Title, HeaderAction, SaveAction } from 'components/Layout';
import AtlasPreviewLoading from 'components/AtlasPreviewLoading';
import CenteredContent from 'components/CenteredContent';

const DISCARD_CHANGES = `
You have unsaved changes.
Are you sure you want to discard them?
`;

type Props = {
  route: Object,
  router: Object,
  params: Object,
  keydown: Object,
};

@withRouter
@observer
class DocumentEdit extends Component {
  store: DocumentEditStore;
  props: Props;

  state = {
    scrollTop: 0,
  };

  constructor(props: Props) {
    super(props);
    this.store = new DocumentEditStore({});
  }

  componentDidMount = () => {
    if (this.props.route.newDocument) {
      this.store.collectionId = this.props.params.id;
      this.store.newDocument = true;
    } else if (this.props.route.editDocument) {
      this.store.documentId = this.props.params.id;
      this.store.fetchDocument();
    } else if (this.props.route.newChildDocument) {
      this.store.documentId = this.props.params.id;
      this.store.newChildDocument = true;
      this.store.fetchDocument();
    } else {
      this.store.documentId = this.props.params.id;
      this.store.newDocument = false;
      this.store.fetchDocument();
    }

    // Prevent user from accidentally leaving with unsaved changes
    const remove = this.props.router.setRouteLeaveHook(this.props.route, () => {
      if (this.store.hasPendingChanges) {
        return confirm(DISCARD_CHANGES);
      }
      remove();
      return null;
    });
  };

  onEdit = () => {
    const url = `${this.store.url}/edit`;
    browserHistory.push(url);
  };

  onSave = (options: { redirect?: boolean } = {}) => {
    if (this.store.newDocument || this.store.newChildDocument) {
      this.store.saveDocument(options);
    } else {
      this.store.updateDocument(options);
    }
  };

  onCancel = () => {
    browserHistory.goBack();
  };

  onScroll = (scrollTop: number) => {
    this.setState({ scrollTop });
  };

  render() {
    const { route } = this.props;
    const title = (
      <Title
        truncate={60}
        placeholder={!this.store.isFetching ? 'Untitled document' : null}
        content={this.store.title}
      />
    );

    const titleText = this.store.title;
    const isNew = route.newDocument || route.newChildDocument;
    const isEditing = route.editDocument;

    const actions = (
      <Flex>
        <HeaderAction>
          {!isEditing && <a onClick={this.onEdit}>Edit</a>}
          {isEditing &&
            <SaveAction
              onClick={this.onSave}
              disabled={this.store.isSaving}
              isNew={isNew}
            />}
        </HeaderAction>
      </Flex>
    );

    return (
      <Layout
        actions={actions}
        title={title}
        titleText={titleText}
        fixed
        loading={this.store.isSaving}
        search={false}
      >
        {this.store.isFetching &&
          <CenteredContent>
            <AtlasPreviewLoading />
          </CenteredContent>}
        {!this.store.isFetching &&
          <Editor
            store={this.store}
            scrollTop={this.state.scrollTop}
            onScroll={this.onScroll}
            onSave={this.onSave}
            onCancel={this.onCancel}
            readOnly={!this.props.route.editDocument}
          />}
      </Layout>
    );
  }
}

export default DocumentEdit;
