// @flow
import * as React from 'react';
import get from 'lodash/get';
import styled from 'styled-components';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter, Prompt } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import keydown from 'react-keydown';
import Flex from 'shared/components/Flex';
import {
  collectionUrl,
  updateDocumentUrl,
  documentMoveUrl,
  documentEditUrl,
  matchDocumentEdit,
  matchDocumentMove,
} from 'utils/routeHelpers';

import Document from 'models/Document';
import Actions from './components/Actions';
import DocumentMove from './components/DocumentMove';
import UiStore from 'stores/UiStore';
import DocumentsStore from 'stores/DocumentsStore';
import CollectionsStore from 'stores/CollectionsStore';
import LoadingPlaceholder from 'components/LoadingPlaceholder';
import LoadingIndicator from 'components/LoadingIndicator';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import Search from 'scenes/Search';

const DISCARD_CHANGES = `
You have unsaved changes.
Are you sure you want to discard them?
`;

type Props = {
  match: Object,
  history: Object,
  location: Location,
  documents: DocumentsStore,
  collections: CollectionsStore,
  newDocument?: boolean,
  ui: UiStore,
};

@observer
class DocumentScene extends React.Component {
  props: Props;
  savedTimeout: number;

  @observable editorComponent;
  @observable editCache: ?string;
  @observable newDocument: ?Document;
  @observable isLoading = false;
  @observable isSaving = false;
  @observable isPublishing = false;
  @observable notFound = false;
  @observable moveModalOpen: boolean = false;

  componentDidMount() {
    this.loadDocument(this.props);
    this.loadEditor();
  }

  componentWillReceiveProps(nextProps) {
    if (
      nextProps.match.params.documentSlug !==
      this.props.match.params.documentSlug
    ) {
      this.notFound = false;
      this.loadDocument(nextProps);
    }
  }

  componentWillUnmount() {
    clearTimeout(this.savedTimeout);
    this.props.ui.clearActiveDocument();
  }

  @keydown('m')
  goToMove(ev) {
    ev.preventDefault();
    if (this.document) this.props.history.push(documentMoveUrl(this.document));
  }

  loadDocument = async props => {
    if (props.newDocument) {
      const newDocument = new Document({
        collection: { id: props.match.params.id },
        parentDocument: new URLSearchParams(props.location.search).get(
          'parentDocument'
        ),
        title: '',
        text: '',
      });
      this.newDocument = newDocument;
    } else {
      let document = this.getDocument(props.match.params.documentSlug);

      if (document) {
        this.props.documents.fetch(props.match.params.documentSlug);
        this.props.ui.setActiveDocument(document);
      } else {
        document = await this.props.documents.fetch(
          props.match.params.documentSlug
        );
      }

      if (document) {
        this.props.ui.setActiveDocument(document);

        // Cache data if user enters edit mode and cancels
        this.editCache = document.text;
        if (!this.isEditing && document.publishedAt) {
          document.view();
        }

        // Update url to match the current one
        this.props.history.replace(
          updateDocumentUrl(props.match.url, document.url)
        );
      } else {
        // Render 404 with search
        this.notFound = true;
      }
    }
  };

  loadEditor = async () => {
    const EditorImport = await import('components/Editor');
    this.editorComponent = EditorImport.default;
  };

  get isEditing() {
    return (
      this.props.match.path === matchDocumentEdit || this.props.newDocument
    );
  }

  getDocument(documentSlug: ?string) {
    if (this.newDocument) return this.newDocument;
    return this.props.documents.getByUrl(
      `/doc/${documentSlug || this.props.match.params.documentSlug}`
    );
  }

  get document() {
    return this.getDocument();
  }

  handleCloseMoveModal = () => (this.moveModalOpen = false);
  handleOpenMoveModal = () => (this.moveModalOpen = true);

  onSave = async (options: { redirect?: boolean, publish?: boolean } = {}) => {
    const { redirect, publish } = options;

    let document = this.document;
    if (!document || !document.allowSave) return;

    this.editCache = null;
    this.isSaving = true;
    this.isPublishing = publish;
    document = await document.save(publish);
    this.isSaving = false;
    this.isPublishing = false;

    if (redirect) {
      this.props.history.push(document.url);
      this.props.ui.setActiveDocument(document);
    } else if (this.props.newDocument) {
      this.props.history.push(documentEditUrl(document));
      this.props.ui.setActiveDocument(document);
    }
  };

  onImageUploadStart = () => {
    this.isLoading = true;
  };

  onImageUploadStop = () => {
    this.isLoading = false;
  };

  onChange = text => {
    let document = this.document;
    if (!document) return;
    if (document.text.trim() === text.trim()) return;
    document.updateData({ text }, true);
  };

  onDiscard = () => {
    let url;
    if (this.document && this.document.url) {
      url = this.document.url;
      if (this.editCache) this.document.updateData({ text: this.editCache });
    } else {
      url = collectionUrl(this.props.match.params.id);
    }
    this.props.history.push(url);
  };

  renderNotFound() {
    return <Search notFound />;
  }

  render() {
    const Editor = this.editorComponent;
    const isMoving = this.props.match.path === matchDocumentMove;
    const document = this.document;
    const titleText =
      get(document, 'title', '') ||
      this.props.collections.titleForDocument(this.props.location.pathname);

    if (this.notFound) {
      return this.renderNotFound();
    }

    return (
      <Container key={this.props.location.pathname} column auto>
        {isMoving && document && <DocumentMove document={document} />}
        {titleText && <PageTitle title={titleText} />}
        {(this.isLoading || this.isSaving) && <LoadingIndicator />}
        {!document || !Editor ? (
          <CenteredContent>
            <LoadingState />
          </CenteredContent>
        ) : (
          <Flex justify="center" auto>
            {this.isEditing && (
              <Prompt
                when={document.hasPendingChanges}
                message={DISCARD_CHANGES}
              />
            )}
            <Editor
              text={document.text}
              emoji={document.emoji}
              onImageUploadStart={this.onImageUploadStart}
              onImageUploadStop={this.onImageUploadStop}
              onChange={this.onChange}
              onSave={this.onSave}
              onCancel={this.onDiscard}
              readOnly={!this.isEditing}
            />
            {document && (
              <Actions
                document={document}
                isDraft={!document.publishedAt}
                isEditing={this.isEditing}
                isSaving={this.isSaving}
                isPublishing={this.isPublishing}
                savingIsDisabled={!document.allowSave}
                history={this.props.history}
                onDiscard={this.onDiscard}
                onSave={this.onSave}
              />
            )}
          </Flex>
        )}
      </Container>
    );
  }
}

const Container = styled(Flex)`
  position: relative;
`;

const LoadingState = styled(LoadingPlaceholder)`
  margin: 90px 0;
`;

export default withRouter(
  inject('ui', 'user', 'documents', 'collections')(DocumentScene)
);
