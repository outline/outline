// @flow
import React, { Component } from 'react';
import get from 'lodash/get';
import styled from 'styled-components';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter, Prompt } from 'react-router';
import Flex from 'components/Flex';
import { color, layout } from 'styles/constants';
import { collectionUrl } from 'utils/routeHelpers';

import Document from 'models/Document';
import UiStore from 'stores/UiStore';
import DocumentsStore from 'stores/DocumentsStore';
import Menu from './components/Menu';
import SaveAction from './components/SaveAction';
import LoadingPlaceholder from 'components/LoadingPlaceholder';
import Editor from 'components/Editor';
import DropToImport from 'components/DropToImport';
import LoadingIndicator from 'components/LoadingIndicator';
import Collaborators from 'components/Collaborators';
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
  keydown: Object,
  documents: DocumentsStore,
  newDocument?: boolean,
  ui: UiStore,
};

@observer class DocumentScene extends Component {
  props: Props;
  savedTimeout: number;

  @observable editCache: ?string;
  @observable newDocument: ?Document;
  @observable isDragging = false;
  @observable isLoading = false;
  @observable isSaving = false;
  @observable showAsSaved = false;
  @observable notFound = false;

  componentDidMount() {
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

  loadDocument = async props => {
    if (props.newDocument) {
      const newDocument = new Document({
        collection: { id: props.match.params.id },
        title: '',
        text: '',
      });
      this.newDocument = newDocument;
    } else {
      let document = this.document;
      if (document) {
        this.props.ui.setActiveDocument(document);
      }

      await this.props.documents.fetch(props.match.params.documentSlug);
      document = this.document;

      if (document) {
        this.props.ui.setActiveDocument(document);
        // Cache data if user enters edit mode and cancels
        this.editCache = document.text;
        document.view();
      } else {
        // Render 404 with search
        this.notFound = true;
      }
    }
  };

  get document() {
    if (this.newDocument) return this.newDocument;
    return this.props.documents.getByUrl(
      `/doc/${this.props.match.params.documentSlug}`
    );
  }

  onClickEdit = () => {
    if (!this.document) return;
    const url = `${this.document.url}/edit`;
    this.props.history.push(url);
  };

  onClickNew = () => {
    if (!this.document) return;
    this.props.history.push(`${this.document.collection.url}/new`);
  };

  onSave = async (redirect: boolean = false) => {
    if (this.document && !this.document.allowSave) return;
    let document = this.document;

    if (!document) return;
    this.isLoading = true;
    this.isSaving = true;
    document = await document.save();
    this.isLoading = false;

    if (redirect || this.props.newDocument) {
      this.props.history.push(document.url);
    } else {
      this.toggleShowAsSaved();
    }
  };

  toggleShowAsSaved() {
    this.showAsSaved = true;
    this.isSaving = false;
    this.savedTimeout = setTimeout(() => (this.showAsSaved = false), 2000);
  }

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

  onCancel = () => {
    let url;
    if (this.document && this.document.url) {
      url = this.document.url;
      if (this.editCache) this.document.updateData({ text: this.editCache });
    } else {
      url = collectionUrl(this.props.match.params.id);
    }
    this.props.history.push(url);
  };

  onStartDragging = () => {
    this.isDragging = true;
  };

  onStopDragging = () => {
    this.isDragging = false;
  };

  renderNotFound() {
    return <Search notFound />;
  }

  render() {
    const isNew = this.props.newDocument;
    const isEditing = !!this.props.match.params.edit || isNew;
    const isFetching = !this.document;
    const titleText = get(this.document, 'title', '');
    const document = this.document;

    if (this.notFound) {
      return this.renderNotFound();
    }

    return (
      <Container column auto>
        {this.isDragging &&
          <DropHere align="center" justify="center">
            Drop files here to import into Atlas.
          </DropHere>}
        {titleText && <PageTitle title={titleText} />}
        {this.isLoading && <LoadingIndicator />}
        {isFetching &&
          <CenteredContent>
            <LoadingState />
          </CenteredContent>}
        {!isFetching &&
          document &&
          <StyledDropToImport
            documentId={document.id}
            history={this.props.history}
            onDragEnter={this.onStartDragging}
            onDragLeave={this.onStopDragging}
            onDrop={this.onStopDragging}
            disabled={isEditing}
          >
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
                onCancel={this.onCancel}
                readOnly={!isEditing}
              />
              <Meta align="center" justify="flex-end" readOnly={!isEditing}>
                <Flex align="center">
                  {document &&
                    !isNew &&
                    !isEditing &&
                    <Collaborators document={document} />}
                  <HeaderAction>
                    {isEditing
                      ? <SaveAction
                          isSaving={this.isSaving}
                          onClick={this.onSave.bind(this, true)}
                          disabled={
                            !(this.document && this.document.allowSave) ||
                              this.isSaving
                          }
                          isNew={!!isNew}
                        />
                      : <a onClick={this.onClickEdit}>
                          Edit
                        </a>}
                  </HeaderAction>
                  <HeaderAction>
                    {isEditing
                      ? <a onClick={this.onCancel}>Cancel</a>
                      : <Menu document={document} />}
                  </HeaderAction>
                  {!isEditing && <Separator />}
                  <HeaderAction>
                    {!isEditing &&
                      <a onClick={this.onClickNew}>
                        New
                      </a>}
                  </HeaderAction>
                </Flex>
              </Meta>
            </Flex>
          </StyledDropToImport>}
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
  min-height: 43px;
  color: ${color.text};
  padding: 0 0 0 14px;

  a,
  svg {
    color: ${color.text};
    opacity: .8;
    transition: opacity 100ms ease-in-out;

    &:hover {
      opacity: 1;
    }
  }
`;

const DropHere = styled(Flex)`
  pointer-events: none;
  position: fixed;
  top: 0;
  left: ${layout.sidebarWidth};
  bottom: 0;
  right: 0;
  text-align: center;
  background: rgba(255,255,255,.9);
  z-index: 1;
`;

const Meta = styled(Flex)`
  align-items: flex-start;
  position: absolute;
  top: 0;
  right: 0;
  padding: ${layout.padding};
`;

const Container = styled(Flex)`
  position: relative;
  width: 100%;
`;

const LoadingState = styled(LoadingPlaceholder)`
  margin: 90px 0;
`;

const StyledDropToImport = styled(DropToImport)`
  display: flex;
  flex: 1;
`;

export default withRouter(inject('ui', 'user', 'documents')(DocumentScene));
