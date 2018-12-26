// @flow
import * as React from 'react';
import { debounce } from 'lodash';
import styled from 'styled-components';
import breakpoint from 'styled-components-breakpoint';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter, Prompt, Route } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import keydown from 'react-keydown';
import Flex from 'shared/components/Flex';
import {
  collectionUrl,
  updateDocumentUrl,
  documentMoveUrl,
  documentHistoryUrl,
  documentEditUrl,
  matchDocumentEdit,
} from 'utils/routeHelpers';
import { emojiToUrl } from 'utils/emoji';

import Header from './components/Header';
import DocumentMove from './components/DocumentMove';
import Branding from './components/Branding';
import ErrorBoundary from 'components/ErrorBoundary';
import DocumentHistory from 'components/DocumentHistory';
import LoadingPlaceholder from 'components/LoadingPlaceholder';
import LoadingIndicator from 'components/LoadingIndicator';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import Search from 'scenes/Search';
import Error404 from 'scenes/Error404';
import ErrorOffline from 'scenes/ErrorOffline';

import UiStore from 'stores/UiStore';
import AuthStore from 'stores/AuthStore';
import DocumentsStore from 'stores/DocumentsStore';
import RevisionsStore from 'stores/RevisionsStore';
import Document from 'models/Document';
import Revision from 'models/Revision';

import schema from './schema';

const AUTOSAVE_DELAY = 3000;
const IS_DIRTY_DELAY = 500;
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
  revisions: RevisionsStore,
  newDocument?: boolean,
  auth: AuthStore,
  ui: UiStore,
};

@observer
class DocumentScene extends React.Component<Props> {
  viewTimeout: TimeoutID;
  getEditorText: () => string;

  @observable editorComponent;
  @observable document: ?Document;
  @observable revision: ?Revision;
  @observable newDocument: ?Document;
  @observable isUploading = false;
  @observable isSaving = false;
  @observable isPublishing = false;
  @observable isDirty = false;
  @observable notFound = false;
  @observable moveModalOpen: boolean = false;

  componentDidMount() {
    this.loadDocument(this.props);
    this.loadEditor();
  }

  componentWillReceiveProps(nextProps) {
    if (
      nextProps.match.params.documentSlug !==
        this.props.match.params.documentSlug ||
      this.props.match.params.revisionId !== nextProps.match.params.revisionId
    ) {
      this.notFound = false;
      clearTimeout(this.viewTimeout);
      this.loadDocument(nextProps);
    }
  }

  componentWillUnmount() {
    clearTimeout(this.viewTimeout);
    this.props.ui.clearActiveDocument();
  }

  goToDocumentCanonical = () => {
    if (this.document) this.props.history.push(this.document.url);
  };

  @keydown('m')
  goToMove(ev) {
    ev.preventDefault();
    if (this.document) this.props.history.push(documentMoveUrl(this.document));
  }

  @keydown('h')
  goToHistory(ev) {
    ev.preventDefault();
    if (!this.document) return;

    if (this.revision) {
      this.props.history.push(this.document.url);
    } else {
      this.props.history.push(documentHistoryUrl(this.document));
    }
  }

  loadDocument = async props => {
    if (props.newDocument) {
      this.document = new Document(
        {
          collection: { id: props.match.params.id },
          parentDocument: new URLSearchParams(props.location.search).get(
            'parentDocument'
          ),
          title: '',
          text: '',
        },
        this.props.documents
      );
    } else {
      const { shareId, revisionId } = props.match.params;

      this.document = await this.props.documents.fetch(
        props.match.params.documentSlug,
        { shareId }
      );

      if (revisionId) {
        this.revision = await this.props.revisions.fetch(
          props.match.params.documentSlug,
          { revisionId }
        );
      } else {
        this.revision = undefined;
      }

      this.isDirty = false;

      const document = this.document;

      if (document) {
        this.props.ui.setActiveDocument(document);

        if (this.props.auth.user && !shareId) {
          if (!this.isEditing && document.publishedAt) {
            this.viewTimeout = setTimeout(document.view, MARK_AS_VIEWED_AFTER);
          }

          if (!this.revision) {
            // Update url to match the current one
            this.props.history.replace(
              updateDocumentUrl(props.match.url, document.url)
            );
          }
        }
      } else {
        // Render 404 with search
        this.notFound = true;
      }
    }
  };

  loadEditor = async () => {
    const EditorImport = await import('./components/Editor');
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
    if (!document) return;

    // get the latest version of the editor text value
    const text = this.getEditorText ? this.getEditorText() : document.text;

    // prevent autosave if nothing has changed
    if (options.autosave && document.text.trim() === text.trim()) return;

    document.text = text;
    if (!document.allowSave) return;

    // prevent autosave before anything has been written
    if (options.autosave && !document.title && !document.id) return;

    let isNew = !document.id;
    this.isSaving = true;
    this.isPublishing = !!options.publish;
    document = await document.save(options);
    this.isDirty = false;
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

  autosave = debounce(() => {
    this.onSave({ done: false, autosave: true });
  }, AUTOSAVE_DELAY);

  updateIsDirty = debounce(() => {
    const document = this.document;

    this.isDirty =
      document && this.getEditorText().trim() !== document.text.trim();
  }, IS_DIRTY_DELAY);

  onImageUploadStart = () => {
    this.isUploading = true;
  };

  onImageUploadStop = () => {
    this.isUploading = false;
  };

  onChange = getEditorText => {
    this.getEditorText = getEditorText;
    this.updateIsDirty();
    this.autosave();
  };

  onDiscard = () => {
    let url;
    if (this.document && this.document.url) {
      url = this.document.url;
    } else {
      url = collectionUrl(this.props.match.params.id);
    }
    this.props.history.push(url);
  };

  onSearchLink = async (term: string) => {
    const results = await this.props.documents.search(term);

    return results.map((result, index) => ({
      title: result.document.title,
      url: result.document.url,
    }));
  };

  render() {
    const { location, auth, match } = this.props;
    const team = auth.team;
    const Editor = this.editorComponent;
    const document = this.document;
    const revision = this.revision;
    const isShare = match.params.shareId;
    const isHistory = match.url.match(/\/history(\/|$)/); // Can't match on history alone as that can be in the user-generated slug

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

    if (!document || !Editor) {
      return (
        <Container column auto>
          <PageTitle title={location.state ? location.state.title : ''} />
          <CenteredContent>
            <LoadingState />
          </CenteredContent>
        </Container>
      );
    }

    const embedsDisabled =
      document.embedsDisabled || (team && !team.documentEmbeds);

    return (
      <ErrorBoundary>
        <Container
          key={revision ? revision.id : document.id}
          sidebar={isHistory}
          isShare={isShare}
          column
          auto
        >
          <Route
            path={`${match.url}/move`}
            component={() => (
              <DocumentMove
                document={document}
                onRequestClose={this.goToDocumentCanonical}
              />
            )}
          />
          <PageTitle
            title={document.title.replace(document.emoji, '')}
            favicon={document.emoji ? emojiToUrl(document.emoji) : undefined}
          />
          {(this.isUploading || this.isSaving) && <LoadingIndicator />}

          <Container justify="center" column auto>
            {this.isEditing && (
              <React.Fragment>
                <Prompt
                  when={this.isDirty || false}
                  message={DISCARD_CHANGES}
                />
                <Prompt
                  when={this.isUploading || false}
                  message={UPLOADING_WARNING}
                />
              </React.Fragment>
            )}
            {!isShare && (
              <Header
                document={document}
                isDraft={document.isDraft}
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
                key={embedsDisabled ? 'embeds-disabled' : 'embeds-enabled'}
                titlePlaceholder="Start with a title…"
                bodyPlaceholder="…the rest is your canvas"
                defaultValue={revision ? revision.text : document.text}
                pretitle={document.emoji}
                disableEmbeds={embedsDisabled}
                onImageUploadStart={this.onImageUploadStart}
                onImageUploadStop={this.onImageUploadStop}
                onSearchLink={this.onSearchLink}
                onChange={this.onChange}
                onSave={this.onSave}
                onCancel={this.onDiscard}
                readOnly={!this.isEditing}
                toc={!revision}
                history={this.props.history}
                ui={this.props.ui}
                schema={schema}
              />
            </MaxWidth>
          </Container>
        </Container>
        {isHistory && (
          <DocumentHistory revision={revision} document={document} />
        )}
        {isShare && <Branding />}
      </ErrorBoundary>
    );
  }
}

const MaxWidth = styled(Flex)`
  padding: 0 16px;
  max-width: 100vw;
  width: 100%;
  height: 100%;

  ${breakpoint('tablet')`	
    padding: 0 24px;
    margin: 12px auto;
    max-width: 46em;
    box-sizing: content-box;
  `};
`;

const Container = styled(Flex)`
  position: relative;
  margin-top: ${props => (props.isShare ? '50px' : '0')};
  margin-right: ${props => (props.sidebar ? props.theme.sidebarWidth : 0)};
`;

const LoadingState = styled(LoadingPlaceholder)`
  margin: 40px 0;
`;

export default withRouter(
  inject('ui', 'auth', 'documents', 'revisions')(DocumentScene)
);
