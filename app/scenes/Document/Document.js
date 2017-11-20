// @flow
import React, { Component } from 'react';
import get from 'lodash/get';
import styled from 'styled-components';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter, Prompt } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import keydown from 'react-keydown';
import Flex from 'shared/components/Flex';
import { color, layout } from 'shared/styles/constants';
import {
  collectionUrl,
  updateDocumentUrl,
  documentMoveUrl,
  documentEditUrl,
  documentNewUrl,
  matchDocumentEdit,
  matchDocumentMove,
} from 'utils/routeHelpers';

import Document from 'models/Document';
import DocumentMove from './components/DocumentMove';
import UiStore from 'stores/UiStore';
import DocumentsStore from 'stores/DocumentsStore';
import CollectionsStore from 'stores/CollectionsStore';
import DocumentMenu from 'menus/DocumentMenu';
import SaveAction from './components/SaveAction';
import LoadingPlaceholder from 'components/LoadingPlaceholder';
import Editor from 'components/Editor';
import LoadingIndicator from 'components/LoadingIndicator';
import Collaborators from 'components/Collaborators';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import NewDocumentIcon from 'components/Icon/NewDocumentIcon';
import Search from 'scenes/Search';

const DISCARD_CHANGES = `
You have unsaved changes.
Are you sure you want to discard them?
`;

type Props = {
  match: Object,
  history: Object,
  location: Location,
  keydown: Object,
  documents: DocumentsStore,
  collections: CollectionsStore,
  newDocument?: boolean,
  ui: UiStore,
};

@observer
class DocumentScene extends Component {
  props: Props;
  savedTimeout: number;

  @observable editCache: ?string;
  @observable newDocument: ?Document;
  @observable isLoading = false;
  @observable isSaving = false;
  @observable notFound = false;
  @observable moveModalOpen: boolean = false;

  componentWillMount() {
    this.loadDocument(this.props);
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
        if (!this.isEditing) document.view();

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

  onClickEdit = () => {
    if (!this.document) return;
    this.props.history.push(documentEditUrl(this.document));
  };

  onClickNew = () => {
    if (!this.document) return;
    this.props.history.push(documentNewUrl(this.document));
  };

  handleCloseMoveModal = () => (this.moveModalOpen = false);
  handleOpenMoveModal = () => (this.moveModalOpen = true);

  onSave = async (redirect: boolean = false) => {
    if (this.document && !this.document.allowSave) return;
    this.editCache = null;
    let document = this.document;

    if (!document) return;
    this.isSaving = true;
    document = await document.save();
    this.isSaving = false;

    if (redirect || this.props.newDocument) {
      this.props.history.push(document.url);
    }
  };

  onImageUploadStart = () => {
    this.isLoading = true;
  };

  onImageUploadStop = () => {
    this.isLoading = false;
  };

  onChange = text => {
    if (!this.document) return;
    this.document.updateData({ text }, true);
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
    const isNew = this.props.newDocument;
    const isMoving = this.props.match.path === matchDocumentMove;
    const document = this.document;
    const isFetching = !document;
    const titleText =
      get(document, 'title', '') ||
      this.props.collections.titleForDocument(this.props.location.pathname);

    if (this.notFound) {
      return this.renderNotFound();
    }

    return (
      <Container column auto>
        {isMoving && document && <DocumentMove document={document} />}
        {titleText && <PageTitle title={titleText} />}
        {(this.isLoading || this.isSaving) && <LoadingIndicator />}
        {isFetching && (
          <CenteredContent>
            <LoadingState />
          </CenteredContent>
        )}
        {!isFetching &&
          document && (
            <Flex justify="center" auto>
              <Prompt
                when={document.hasPendingChanges}
                message={DISCARD_CHANGES}
              />
              <Editor
                key={document.id}
                text={document.text}
                emoji={document.emoji}
                onImageUploadStart={this.onImageUploadStart}
                onImageUploadStop={this.onImageUploadStop}
                onChange={this.onChange}
                onSave={this.onSave}
                onCancel={this.onDiscard}
                readOnly={!this.isEditing}
              />
              <Meta
                align="center"
                justify="flex-end"
                readOnly={!this.isEditing}
              >
                <Flex align="center">
                  {!isNew &&
                    !this.isEditing && <Collaborators document={document} />}
                  <HeaderAction>
                    {this.isEditing ? (
                      <SaveAction
                        isSaving={this.isSaving}
                        onClick={this.onSave.bind(this, true)}
                        disabled={
                          !(this.document && this.document.allowSave) ||
                          this.isSaving
                        }
                        isNew={!!isNew}
                      />
                    ) : (
                      <a onClick={this.onClickEdit}>Edit</a>
                    )}
                  </HeaderAction>
                  {this.isEditing && (
                    <HeaderAction>
                      <a onClick={this.onDiscard}>Discard</a>
                    </HeaderAction>
                  )}
                  {!this.isEditing && (
                    <HeaderAction>
                      <DocumentMenu document={document} />
                    </HeaderAction>
                  )}
                  {!this.isEditing && <Separator />}
                  <HeaderAction>
                    {!this.isEditing && (
                      <a onClick={this.onClickNew}>
                        <NewDocumentIcon />
                      </a>
                    )}
                  </HeaderAction>
                </Flex>
              </Meta>
            </Flex>
          )}
      </Container>
    );
  }
}

const Separator = styled.div`
  margin-left: 12px;
  width: 1px;
  height: 20px;
  background: ${color.slateLight};
`;

const HeaderAction = styled(Flex)`
  justify-content: center;
  align-items: center;
  padding: 0 0 0 10px;

  a {
    color: ${color.text};
    height: 24px;
  }
`;

const Meta = styled(Flex)`
  align-items: flex-start;
  position: fixed;
  top: 0;
  right: 0;
  padding: ${layout.vpadding} ${layout.hpadding} 8px 8px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.9);
  -webkit-backdrop-filter: blur(20px);
`;

const Container = styled(Flex)`
  position: relative;
  width: 100%;
`;

const LoadingState = styled(LoadingPlaceholder)`
  margin: 90px 0;
`;

export default withRouter(
  inject('ui', 'user', 'documents', 'collections')(DocumentScene)
);
