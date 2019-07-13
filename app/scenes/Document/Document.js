// @flow
import * as React from 'react';
import { debounce } from 'lodash';
import styled from 'styled-components';
import breakpoint from 'styled-components-breakpoint';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { Prompt, Route, withRouter } from 'react-router-dom';
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
import Backlinks from './components/Backlinks';
import ErrorBoundary from 'components/ErrorBoundary';
import LoadingPlaceholder from 'components/LoadingPlaceholder';
import LoadingIndicator from 'components/LoadingIndicator';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';
import Notice from 'shared/components/Notice';
import Time from 'shared/components/Time';
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

let EditorImport;
const AUTOSAVE_DELAY = 3000;
const IS_DIRTY_DELAY = 500;
const MARK_AS_VIEWED_AFTER = 3000;
const DISCARD_CHANGES = `
You have unsaved changes.
Are you sure you want to discard them?
`;
const UPLOADING_WARNING = `
Images are still uploading.
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

  @observable editorComponent = EditorImport;
  @observable document: ?Document;
  @observable revision: ?Revision;
  @observable newDocument: ?Document;
  @observable isUploading: boolean = false;
  @observable isSaving: boolean = false;
  @observable isPublishing: boolean = false;
  @observable isDirty: boolean = false;
  @observable isEmpty: boolean = true;
  @observable notFound: boolean = false;
  @observable moveModalOpen: boolean = false;

  constructor(props) {
    super();
    this.document = props.documents.getByUrl(props.match.params.documentSlug);
    this.loadDocument(props);
    this.loadEditor();
  }

  componentWillUnmount() {
    clearTimeout(this.viewTimeout);
  }

  goToDocumentCanonical = () => {
    if (this.document) this.props.history.push(this.document.url);
  };

  @keydown('m')
  goToMove(ev) {
    ev.preventDefault();

    if (this.document && !this.document.isArchived && !this.document.isDraft) {
      this.props.history.push(documentMoveUrl(this.document));
    }
  }

  @keydown('e')
  goToEdit(ev) {
    ev.preventDefault();

    if (this.document && !this.document.isArchived) {
      this.props.history.push(documentEditUrl(this.document));
    }
  }

  @keydown('esc')
  goBack(ev) {
    if (this.isEditing) {
      ev.preventDefault();
      this.props.history.goBack();
    }
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
          collectionId: props.match.params.id,
          parentDocumentId: new URLSearchParams(props.location.search).get(
            'parentDocumentId'
          ),
          title: '',
          text: '',
        },
        props.documents
      );
    } else {
      const { shareId, revisionId } = props.match.params;

      this.document = await props.documents.fetch(
        props.match.params.documentSlug,
        { shareId }
      );

      if (revisionId) {
        this.revision = await props.revisions.fetch(
          props.match.params.documentSlug,
          { revisionId }
        );
      } else {
        this.revision = undefined;
      }

      this.isDirty = false;
      this.isEmpty = false;

      const document = this.document;

      if (document) {
        this.props.ui.setActiveDocument(document);

        if (document.isArchived && this.isEditing) {
          return this.goToDocumentCanonical();
        }

        if (this.props.auth.user && !shareId) {
          if (!this.isEditing && document.publishedAt) {
            this.viewTimeout = setTimeout(document.view, MARK_AS_VIEWED_AFTER);
          }

          const isMove = props.location.pathname.match(/move$/);
          const canRedirect = !this.revision && !isMove;
          if (canRedirect) {
            const canonicalUrl = updateDocumentUrl(
              props.match.url,
              document.url
            );
            if (props.location.pathname !== canonicalUrl) {
              props.history.replace(canonicalUrl);
            }
          }
        }
      } else {
        // Render 404 with search
        this.notFound = true;
      }
    }
  };

  loadEditor = async () => {
    if (this.editorComponent) return;

    const Imported = await import('./components/Editor');
    EditorImport = Imported.default;
    this.editorComponent = EditorImport;
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

    // prevent saves when we are already saving
    if (document.isSaving) return;

    // get the latest version of the editor text value
    const text = this.getEditorText ? this.getEditorText() : document.text;

    // prevent save before anything has been written (single hash is empty doc)
    if (text.trim() === '#') return;

    // prevent autosave if nothing has changed
    if (options.autosave && document.text.trim() === text.trim()) return;

    document.text = text;

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
    const editorText = this.getEditorText().trim();

    // a single hash is a doc with just an empty title
    this.isEmpty = editorText === '#';
    this.isDirty = !!document && editorText !== document.text.trim();
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
          <PageTitle
            title={location.state ? location.state.title : 'Untitled'}
          />
          <CenteredContent>
            <LoadingState />
          </CenteredContent>
        </Container>
      );
    }

    const embedsDisabled = team && !team.documentEmbeds;

    return (
      <ErrorBoundary>
        <Container
          key={revision ? revision.id : document.id}
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
            title={document.title.replace(document.emoji, '') || 'Untitled'}
            favicon={document.emoji ? emojiToUrl(document.emoji) : undefined}
          />
          {(this.isUploading || this.isSaving) && <LoadingIndicator />}

          <Container justify="center" column auto>
            {this.isEditing && (
              <React.Fragment>
                <Prompt
                  when={this.isDirty && !this.isUploading}
                  message={DISCARD_CHANGES}
                />
                <Prompt
                  when={this.isUploading && !this.isDirty}
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
                publishingIsDisabled={
                  document.isSaving || this.isPublishing || this.isEmpty
                }
                savingIsDisabled={document.isSaving || this.isEmpty}
                onDiscard={this.onDiscard}
                onSave={this.onSave}
              />
            )}
            <MaxWidth archived={document.isArchived} column auto>
              {document.archivedAt && (
                <Notice muted>
                  Archived by {document.updatedBy.name}{' '}
                  <Time dateTime={document.archivedAt} /> ago
                </Notice>
              )}
              <Editor
                id={document.id}
                key={embedsDisabled ? 'embeds-disabled' : 'embeds-enabled'}
                defaultValue={revision ? revision.text : document.text}
                pretitle={document.emoji}
                disableEmbeds={embedsDisabled}
                onImageUploadStart={this.onImageUploadStart}
                onImageUploadStop={this.onImageUploadStop}
                onSearchLink={this.onSearchLink}
                onChange={this.onChange}
                onSave={this.onSave}
                onCancel={this.onDiscard}
                readOnly={!this.isEditing || document.isArchived}
                toc={!revision}
                ui={this.props.ui}
                schema={schema}
              />
              {!this.isEditing &&
                !isShare && (
                  <Backlinks
                    documents={this.props.documents}
                    document={document}
                  />
                )}
            </MaxWidth>
          </Container>
        </Container>
        {isShare && <Branding />}
      </ErrorBoundary>
    );
  }
}

const MaxWidth = styled(Flex)`
  ${props =>
    props.archived && `* { color: ${props.theme.textSecondary} !important; } `};
  padding: 0 16px;
  max-width: 100vw;
  width: 100%;

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
`;

const LoadingState = styled(LoadingPlaceholder)`
  margin: 40px 0;
`;

export default withRouter(
  inject('ui', 'auth', 'documents', 'revisions')(DocumentScene)
);
