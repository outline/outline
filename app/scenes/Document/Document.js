// @flow
import * as React from 'react';
import debounce from 'lodash/debounce';
import styled from 'styled-components';
import breakpoint from 'styled-components-breakpoint';
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
import { uploadFile } from 'utils/uploadFile';
import isInternalUrl from 'utils/isInternalUrl';

import Document from 'models/Document';
import Header from './components/Header';
import DocumentMove from './components/DocumentMove';
import UiStore from 'stores/UiStore';
import AuthStore from 'stores/AuthStore';
import DocumentsStore from 'stores/DocumentsStore';
import LoadingPlaceholder from 'components/LoadingPlaceholder';
import LoadingIndicator from 'components/LoadingIndicator';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import Search from 'scenes/Search';
import Error404 from 'scenes/Error404';
import ErrorOffline from 'scenes/ErrorOffline';

const AUTOSAVE_INTERVAL = 3000;
const MARK_AS_VIEWED_AFTER = 3000;
const DISCARD_CHANGES = `
You have unsaved changes.
Are you sure you want to discard them?
`;
const UPLOADING_WARNING = `
Image are still uploading.
Are you sure you want to discard them?
`;

type Props = {
  match: Object,
  history: Object,
  location: Location,
  documents: DocumentsStore,
  newDocument?: boolean,
  auth: AuthStore,
  ui: UiStore,
};

@observer
class DocumentScene extends React.Component<Props> {
  savedTimeout: TimeoutID;
  viewTimeout: TimeoutID;

  @observable editorComponent;
  @observable editCache: ?string;
  @observable document: ?Document;
  @observable newDocument: ?Document;
  @observable isUploading = false;
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
    clearTimeout(this.viewTimeout);

    this.props.ui.clearActiveDocument();
  }

  @keydown('m')
  goToMove(ev) {
    ev.preventDefault();
    if (this.document) this.props.history.push(documentMoveUrl(this.document));
  }

  loadDocument = async props => {
    if (props.newDocument) {
      this.document = new Document({
        collection: { id: props.match.params.id },
        parentDocument: new URLSearchParams(props.location.search).get(
          'parentDocument'
        ),
        title: '',
        text: '',
      });
    } else {
      this.document = await this.props.documents.fetch(
        props.match.params.documentSlug,
        { shareId: props.match.params.shareId }
      );

      const document = this.document;

      if (document) {
        this.props.ui.setActiveDocument(document);

        // Cache data if user enters edit mode and cancels
        this.editCache = document.text;

        if (this.props.auth.user) {
          if (!this.isEditing && document.publishedAt) {
            this.viewTimeout = setTimeout(document.view, MARK_AS_VIEWED_AFTER);
          }

          // Update url to match the current one
          this.props.history.replace(
            updateDocumentUrl(props.match.url, document.url)
          );
        }
      } else {
        // Render 404 with search
        this.notFound = true;
      }
    }
  };

  loadEditor = async () => {
    const EditorImport = await import('rich-markdown-editor');
    this.editorComponent = EditorImport.default;
  };

  get isEditing() {
    const document = this.document;

    return !!(
      this.props.match.path === matchDocumentEdit ||
      (document && !document.id)
    );
  }

  handleCloseMoveModal = () => (this.moveModalOpen = false);
  handleOpenMoveModal = () => (this.moveModalOpen = true);

  onSave = async (
    options: { done?: boolean, publish?: boolean, autosave?: boolean } = {}
  ) => {
    let document = this.document;
    if (!document || !document.allowSave) return;

    let isNew = !document.id;
    this.editCache = null;
    this.isSaving = true;
    this.isPublishing = !!options.publish;
    document = await document.save(options);
    this.isSaving = false;
    this.isPublishing = false;

    if (options.done) {
      this.props.history.push(document.url);
      this.props.ui.setActiveDocument(document);
    } else if (isNew) {
      this.props.history.push(documentEditUrl(document));
      this.props.ui.setActiveDocument(document);
    }
  };

  autosave = debounce(async () => {
    this.onSave({ done: false, autosave: true });
  }, AUTOSAVE_INTERVAL);

  onImageUploadStart = () => {
    this.isUploading = true;
  };

  onImageUploadStop = () => {
    this.isUploading = false;
  };

  onChange = text => {
    let document = this.document;
    if (!document) return;
    if (document.text.trim() === text.trim()) return;
    document.updateData({ text }, true);

    // prevent autosave before anything has been written
    if (!document.title && !document.id) return;
    this.autosave();
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

  onUploadImage = async (file: File) => {
    const result = await uploadFile(file);
    return result.url;
  };

  onSearchLink = async (term: string) => {
    const resultIds = await this.props.documents.search(term);

    return resultIds.map((id, index) => {
      const document = this.props.documents.getById(id);
      if (!document) return {};

      return {
        title: document.title,
        url: document.url,
      };
    });
  };

  onClickLink = (href: string) => {
    if (isInternalUrl(href)) {
      // relative
      if (href[0] === '/') {
        this.props.history.push(href);
      }

      // absolute
      const url = new URL(href);
      this.props.history.push(url.pathname);
    } else {
      window.open(href, '_blank');
    }
  };

  render() {
    const { location, match } = this.props;
    const Editor = this.editorComponent;
    const isMoving = match.path === matchDocumentMove;
    const document = this.document;
    const titleFromState = location.state ? location.state.title : '';
    const titleText = document ? document.title : titleFromState;
    const isShare = match.params.shareId;

    if (this.notFound) {
      return navigator.onLine ? (
        isShare ? (
          <Error404 />
        ) : (
          <Search notFound />
        )
      ) : (
        <ErrorOffline />
      );
    }

    return (
      <Container key={document ? document.id : undefined} column auto>
        {isMoving && document && <DocumentMove document={document} />}
        {titleText && <PageTitle title={titleText} />}
        {(this.isUploading || this.isSaving) && <LoadingIndicator />}
        {!document || !Editor ? (
          <CenteredContent>
            <LoadingState />
          </CenteredContent>
        ) : (
          <Container justify="center" column auto>
            {this.isEditing && (
              <React.Fragment>
                <Prompt
                  when={document.hasPendingChanges}
                  message={DISCARD_CHANGES}
                />
                <Prompt when={this.isUploading} message={UPLOADING_WARNING} />
              </React.Fragment>
            )}
            {document &&
              !isShare && (
                <Header
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
            <MaxWidth column auto>
              <Editor
                titlePlaceholder="Start with a title…"
                bodyPlaceholder="…the rest is your canvas"
                defaultValue={document.text}
                pretitle={document.emoji}
                uploadImage={this.onUploadImage}
                onImageUploadStart={this.onImageUploadStart}
                onImageUploadStop={this.onImageUploadStop}
                onSearchLink={this.onSearchLink}
                onClickLink={this.onClickLink}
                onChange={this.onChange}
                onSave={this.onSave}
                onCancel={this.onDiscard}
                readOnly={!this.isEditing}
                toc
              />
            </MaxWidth>
          </Container>
        )}
      </Container>
    );
  }
}

const MaxWidth = styled(Flex)`
  padding: 0 16px;
  max-width: 100vw;
  width: 100%;
  height: 100%;

  ${breakpoint('tablet')`	
    padding: 0;
    margin: 12px auto;
    max-width: 46em;
  `};
`;

const Container = styled(Flex)`
  position: relative;
`;

const LoadingState = styled(LoadingPlaceholder)`
  margin: 40px 0;
`;

export default withRouter(inject('ui', 'auth', 'documents')(DocumentScene));
