// @flow
import React, { Component } from 'react';
import get from 'lodash/get';
import { observer } from 'mobx-react';
import { withRouter, Prompt } from 'react-router';
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
  match: Object,
  history: Object,
  keydown: Object,
  editDocument?: boolean,
  newChildDocument?: boolean,
  editDocument?: boolean,
};

@observer class Document extends Component {
  store: DocumentStore;
  props: Props;

  constructor(props: Props) {
    super(props);
    this.store = new DocumentStore({ history: this.props.history });
  }

  componentDidMount = () => {
    if (this.props.newDocument) {
      this.store.collectionId = this.props.match.params.id;
      this.store.newDocument = true;
    } else if (this.props.editDocument) {
      this.store.documentId = this.props.match.params.id;
      this.store.fetchDocument();
    } else if (this.props.newChildDocument) {
      this.store.documentId = this.props.match.params.id;
      this.store.newChildDocument = true;
      this.store.fetchDocument();
    } else {
      this.store.documentId = this.props.match.params.id;
      this.store.newDocument = false;
      this.store.fetchDocument();
    }
  };

  onEdit = () => {
    const url = `${this.store.document.url}/edit`;
    this.props.history.push(url);
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
    this.props.history.goBack();
  };

  render() {
    const isNew = this.props.newDocument || this.props.newChildDocument;
    const isEditing = this.props.editDocument;
    const title = (
      <Breadcrumbs
        document={this.store.document}
        pathToDocument={this.store.pathToDocument}
      />
    );

    const titleText =
      this.store.document &&
      `${get(this.store, 'document.collection.name')} - ${get(this.store, 'document.title')}`;

    const actions = (
      <Flex>
        <HeaderAction>
          {isEditing
            ? <SaveAction
                onClick={this.onSave}
                disabled={this.store.isSaving}
                isNew={!!isNew}
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
        <Prompt when={this.store.hasPendingChanges} message={DISCARD_CHANGES} />
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
            readOnly={!this.props.editDocument}
          />}
      </Layout>
    );
  }
}

export default withRouter(Document);
