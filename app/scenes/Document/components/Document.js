// @flow
import * as React from 'react';
import { debounce } from 'lodash';
import styled from 'styled-components';
import breakpoint from 'styled-components-breakpoint';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { Prompt, Route, withRouter } from 'react-router-dom';
import type { Location, RouterHistory } from 'react-router-dom';
import keydown from 'react-keydown';
import Flex from 'shared/components/Flex';
import {
  collectionUrl,
  documentMoveUrl,
  documentHistoryUrl,
  documentEditUrl,
} from 'utils/routeHelpers';
import { emojiToUrl } from 'utils/emoji';

import Header from './Header';
import DocumentMove from './DocumentMove';
import KeyboardShortcuts from './KeyboardShortcuts';
import References from './References';
import Loading from './Loading';
import Container from './Container';
import Contents from './Contents';
import MarkAsViewed from './MarkAsViewed';
import ErrorBoundary from 'components/ErrorBoundary';
import LoadingIndicator from 'components/LoadingIndicator';
import PageTitle from 'components/PageTitle';
import Branding from 'shared/components/Branding';
import Notice from 'shared/components/Notice';
import Time from 'shared/components/Time';

import UiStore from 'stores/UiStore';
import AuthStore from 'stores/AuthStore';
import Document from 'models/Document';
import Revision from 'models/Revision';

let EditorImport;
const AUTOSAVE_DELAY = 3000;
const IS_DIRTY_DELAY = 500;
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
  history: RouterHistory,
  location: Location,
  abilities: Object,
  document: Document,
  revision: Revision,
  readOnly: boolean,
  onSearchLink: (term: string) => mixed,
  auth: AuthStore,
  ui: UiStore,
};

@observer
class DocumentScene extends React.Component<Props> {
  @observable editor: ?any;
  getEditorText: () => string = () => this.props.document.text;

  @observable editorComponent = EditorImport;
  @observable isUploading: boolean = false;
  @observable isSaving: boolean = false;
  @observable isPublishing: boolean = false;
  @observable isDirty: boolean = false;
  @observable isEmpty: boolean = true;
  @observable moveModalOpen: boolean = false;
  @observable title: string;

  constructor(props) {
    super();
    this.title = props.document.title;
    this.loadEditor();
  }

  componentDidMount() {
    this.updateIsDirty();
  }

  @keydown('m')
  goToMove(ev) {
    if (!this.props.readOnly) return;

    ev.preventDefault();
    const { document, abilities } = this.props;

    if (abilities.update) {
      this.props.history.push(documentMoveUrl(document));
    }
  }

  @keydown('e')
  goToEdit(ev) {
    if (!this.props.readOnly) return;

    ev.preventDefault();
    const { document, abilities } = this.props;

    if (abilities.update) {
      this.props.history.push(documentEditUrl(document));
    }
  }

  @keydown('esc')
  goBack(ev) {
    if (this.props.readOnly) return;

    ev.preventDefault();
    this.props.history.goBack();
  }

  @keydown('h')
  goToHistory(ev) {
    if (!this.props.readOnly) return;

    ev.preventDefault();
    const { document, revision } = this.props;

    if (revision) {
      this.props.history.push(document.url);
    } else {
      this.props.history.push(documentHistoryUrl(document));
    }
  }

  @keydown('meta+shift+p')
  onPublish(ev) {
    ev.preventDefault();
    const { document } = this.props;
    if (document.publishedAt) return;
    this.onSave({ publish: true, done: true });
  }

  @keydown('meta+ctrl+h')
  onToggleTableOfContents(ev) {
    if (!this.props.readOnly) return;

    ev.preventDefault();
    const { ui } = this.props;

    if (ui.tocVisible) {
      ui.hideTableOfContents();
    } else {
      ui.showTableOfContents();
    }
  }

  loadEditor = async () => {
    if (this.editorComponent) return;

    try {
      const EditorImport = await import('./Editor');
      this.editorComponent = EditorImport.default;
    } catch (err) {
      console.error(err);

      // If the editor bundle fails to load then reload the entire window. This
      // can happen if a deploy happens between the user loading the initial JS
      // bundle and the async-loaded editor JS bundle as the hash will change.
      window.location.reload();
    }
  };

  handleCloseMoveModal = () => (this.moveModalOpen = false);
  handleOpenMoveModal = () => (this.moveModalOpen = true);

  onSave = async (
    options: { done?: boolean, publish?: boolean, autosave?: boolean } = {}
  ) => {
    const { document } = this.props;

    // prevent saves when we are already saving
    if (document.isSaving) return;

    // get the latest version of the editor text value
    const text = this.getEditorText ? this.getEditorText() : document.text;
    const title = this.title;

    // prevent save before anything has been written (single hash is empty doc)
    if (text.trim() === '' && title.trim === '') return;

    // prevent autosave if nothing has changed
    if (
      options.autosave &&
      document.text.trim() === text.trim() &&
      document.title.trim() === title.trim()
    )
      return;

    document.title = title;
    document.text = text;

    let isNew = !document.id;
    this.isSaving = true;
    this.isPublishing = !!options.publish;
    const savedDocument = await document.save(options);
    this.isDirty = false;
    this.isSaving = false;
    this.isPublishing = false;

    if (options.done) {
      this.props.history.push(savedDocument.url);
      this.props.ui.setActiveDocument(savedDocument);
    } else if (isNew) {
      this.props.history.push(documentEditUrl(savedDocument));
      this.props.ui.setActiveDocument(savedDocument);
    }
  };

  autosave = debounce(() => {
    this.onSave({ done: false, autosave: true });
  }, AUTOSAVE_DELAY);

  updateIsDirty = () => {
    const { document } = this.props;
    const editorText = this.getEditorText().trim();
    const titleChanged = this.title !== document.title;
    const bodyChanged = editorText !== document.text.trim();

    // a single hash is a doc with just an empty title
    this.isEmpty = (!editorText || editorText === '#') && !this.title;
    this.isDirty = bodyChanged || titleChanged;
  };

  updateIsDirtyDebounced = debounce(this.updateIsDirty, IS_DIRTY_DELAY);

  onImageUploadStart = () => {
    this.isUploading = true;
  };

  onImageUploadStop = () => {
    this.isUploading = false;
  };

  onChange = getEditorText => {
    this.getEditorText = getEditorText;
    this.updateIsDirtyDebounced();
    this.autosave();
  };

  onChangeTitle = event => {
    this.title = event.target.value;
    this.updateIsDirtyDebounced();
    this.autosave();
  };

  goBack = () => {
    let url;
    if (this.props.document.url) {
      url = this.props.document.url;
    } else {
      url = collectionUrl(this.props.match.params.id);
    }
    this.props.history.push(url);
  };

  render() {
    const {
      document,
      revision,
      readOnly,
      location,
      auth,
      ui,
      match,
    } = this.props;
    const team = auth.team;
    const Editor = this.editorComponent;
    const isShare = !!match.params.shareId;

    if (!Editor) {
      return <Loading location={location} />;
    }

    const disableEmbeds =
      (team && team.documentEmbeds === false) || document.embedsDisabled;

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
              <DocumentMove document={document} onRequestClose={this.goBack} />
            )}
          />
          <PageTitle
            title={document.title.replace(document.emoji, '') || 'Untitled'}
            favicon={document.emoji ? emojiToUrl(document.emoji) : undefined}
          />
          {(this.isUploading || this.isSaving) && <LoadingIndicator />}

          <Container justify="center" column auto>
            {!readOnly && (
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
                isRevision={!!revision}
                isDraft={document.isDraft}
                isEditing={!readOnly}
                isSaving={this.isSaving}
                isPublishing={this.isPublishing}
                publishingIsDisabled={
                  document.isSaving || this.isPublishing || this.isEmpty
                }
                savingIsDisabled={document.isSaving || this.isEmpty}
                goBack={this.goBack}
                onSave={this.onSave}
              />
            )}
            <MaxWidth
              archived={document.isArchived}
              tocVisible={ui.tocVisible}
              column
              auto
            >
              {document.archivedAt &&
                !document.deletedAt && (
                  <Notice muted>
                    Archived by {document.updatedBy.name}{' '}
                    <Time dateTime={document.archivedAt} /> ago
                  </Notice>
                )}
              {document.deletedAt && (
                <Notice muted>
                  Deleted by {document.updatedBy.name}{' '}
                  <Time dateTime={document.deletedAt} /> ago
                  {document.permanentlyDeletedAt && (
                    <React.Fragment>
                      <br />
                      This document will be permanently deleted in{' '}
                      <Time dateTime={document.permanentlyDeletedAt} /> unless
                      restored.
                    </React.Fragment>
                  )}
                </Notice>
              )}
              <Flex auto={!readOnly}>
                {ui.tocVisible &&
                  readOnly && (
                    <Contents
                      headings={this.editor ? this.editor.getHeadings() : []}
                    />
                  )}
                <Editor
                  id={document.id}
                  ref={ref => {
                    if (ref) {
                      this.editor = ref;
                    }
                  }}
                  isDraft={document.isDraft}
                  key={disableEmbeds ? 'embeds-disabled' : 'embeds-enabled'}
                  title={revision ? revision.title : this.title}
                  document={document}
                  defaultValue={revision ? revision.text : document.text}
                  disableEmbeds={disableEmbeds}
                  onImageUploadStart={this.onImageUploadStart}
                  onImageUploadStop={this.onImageUploadStop}
                  onSearchLink={this.props.onSearchLink}
                  onChangeTitle={this.onChangeTitle}
                  onChange={this.onChange}
                  onSave={this.onSave}
                  onPublish={this.onPublish}
                  onCancel={this.goBack}
                  readOnly={readOnly || document.isArchived}
                  ui={this.props.ui}
                />
              </Flex>
              {readOnly &&
                !isShare &&
                !revision && (
                  <React.Fragment>
                    <MarkAsViewed document={document} />
                    <ReferencesWrapper isOnlyTitle={document.isOnlyTitle}>
                      <References document={document} />
                    </ReferencesWrapper>
                  </React.Fragment>
                )}
            </MaxWidth>
          </Container>
        </Container>
        {isShare ? <Branding /> : <KeyboardShortcuts />}
      </ErrorBoundary>
    );
  }
}

const ReferencesWrapper = styled('div')`
  margin-top: ${props => (props.isOnlyTitle ? -45 : 16)}px;
`;

const MaxWidth = styled(Flex)`
  ${props =>
    props.archived && `* { color: ${props.theme.textSecondary} !important; } `};
  padding: 0 16px;
  max-width: 100vw;
  width: 100%;

  ${breakpoint('tablet')`	
    padding: 0 24px;
    margin: 4px auto 12px;
    max-width: calc(48px + ${props => (props.tocVisible ? '64em' : '46em')});
  `};

  ${breakpoint('desktopLarge')`
    max-width: calc(48px + 46em);
  `};
`;

export default withRouter(
  inject('ui', 'auth', 'documents', 'policies', 'revisions')(DocumentScene)
);
