// @flow
import React, { Component } from 'react';
import get from 'lodash/get';
import { observer } from 'mobx-react';
import { browserHistory, withRouter } from 'react-router';
import { Flex } from 'reflexbox';

import DocumentStore from './DocumentStore';
import Breadcrumbs from './components/Breadcrumbs';
import Editor from './components/Editor';
import Menu from './components/Menu';
import Layout, { HeaderAction, SaveAction } from 'components/Layout';
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
class Document extends Component {
  store: DocumentStore;
  props: Props;

  constructor(props: Props) {
    super(props);
    this.store = new DocumentStore({});
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
    const url = `${this.store.document.url}/edit`;
    browserHistory.push(url);
  };

  onSave = (options: { redirect?: boolean } = {}) => {
    if (this.store.newDocument || this.store.newChildDocument) {
      this.store.saveDocument(options);
    } else {
      this.store.updateDocument(options);
    }
  };

  onImageUploadStart = () => {
    this.store.updateUploading(true);
  };

  onImageUploadStop = () => {
    this.store.updateUploading(false);
  };

  onCancel = () => {
    browserHistory.goBack();
  };

  render() {
    const { route } = this.props;
    const isNew = route.newDocument || route.newChildDocument;
    const isEditing = route.editDocument;
    const title = (
      <Breadcrumbs
        document={this.store.document}
        pathToDocument={this.store.pathToDocument}
      />
    );
    const titleText = `${get(this.store, 'document.collection.name')} - ${get(this.store, 'document.title')}`;

    const actions = (
      <Flex>
        <HeaderAction>
          {isEditing
            ? <SaveAction
                onClick={this.onSave}
                disabled={this.store.isSaving}
                isNew={isNew}
              />
            : <a onClick={this.onEdit}>Edit</a>}
        </HeaderAction>
        <Menu
          store={this.store}
          document={this.store.document}
          collectionTree={this.store.collectionTree}
        />
      </Flex>
    );

    return (
      <Layout
        actions={actions}
        title={title}
        titleText={titleText}
        loading={this.store.isSaving || this.store.isUploading}
        search={false}
        fixed
      >
        {this.store.isFetching &&
          <CenteredContent>
            <AtlasPreviewLoading />
          </CenteredContent>}
        {this.store.document &&
          <Editor
            text={this.store.document.text}
            onImageUploadStart={this.onImageUploadStart}
            onImageUploadStop={this.onImageUploadStop}
            onChange={this.store.updateText}
            onSave={this.onSave}
            onCancel={this.onCancel}
            readOnly={!this.props.route.editDocument}
          />}
      </Layout>
    );
  }
}

export default Document;
