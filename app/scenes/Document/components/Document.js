// @flow
import { debounce } from "lodash";
import { observable } from "mobx";
import { observer, inject } from "mobx-react";
import { InputIcon } from "outline-icons";
import * as React from "react";
import keydown from "react-keydown";
import { Prompt, Route, withRouter } from "react-router-dom";
import type { RouterHistory, Match } from "react-router-dom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import AuthStore from "stores/AuthStore";
import UiStore from "stores/UiStore";
import Document from "models/Document";
import Revision from "models/Revision";
import DocumentMove from "scenes/DocumentMove";
import Branding from "components/Branding";
import ErrorBoundary from "components/ErrorBoundary";
import Flex from "components/Flex";
import LoadingIndicator from "components/LoadingIndicator";
import LoadingPlaceholder from "components/LoadingPlaceholder";
import Modal from "components/Modal";
import Notice from "components/Notice";
import PageTitle from "components/PageTitle";
import Time from "components/Time";
import Container from "./Container";
import Contents from "./Contents";
import Editor from "./Editor";
import Header from "./Header";
import KeyboardShortcutsButton from "./KeyboardShortcutsButton";
import MarkAsViewed from "./MarkAsViewed";
import References from "./References";
import { type LocationWithState, type Theme } from "types";
import { isCustomDomain } from "utils/domains";
import { emojiToUrl } from "utils/emoji";
import { meta } from "utils/keyboard";
import {
  collectionUrl,
  documentMoveUrl,
  documentHistoryUrl,
  editDocumentUrl,
  documentUrl,
} from "utils/routeHelpers";

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
  match: Match,
  history: RouterHistory,
  location: LocationWithState,
  abilities: Object,
  document: Document,
  revision: Revision,
  readOnly: boolean,
  onCreateLink: (title: string) => Promise<string>,
  onSearchLink: (term: string) => any,
  theme: Theme,
  auth: AuthStore,
  ui: UiStore,
};

@observer
class DocumentScene extends React.Component<Props> {
  @observable editor = React.createRef();
  @observable isUploading: boolean = false;
  @observable isSaving: boolean = false;
  @observable isPublishing: boolean = false;
  @observable isDirty: boolean = false;
  @observable isEmpty: boolean = true;
  @observable lastRevision: number = this.props.document.revision;
  @observable title: string = this.props.document.title;
  getEditorText: () => string = () => this.props.document.text;

  componentDidUpdate(prevProps) {
    const { auth, document } = this.props;

    if (prevProps.readOnly && !this.props.readOnly) {
      this.updateIsDirty();
    }

    if (this.props.readOnly) {
      this.lastRevision = document.revision;

      if (document.title !== this.title) {
        this.title = document.title;
      }
    } else if (prevProps.document.revision !== this.lastRevision) {
      if (auth.user && document.updatedBy.id !== auth.user.id) {
        this.props.ui.showToast(
          `Document updated by ${document.updatedBy.name}`,
          {
            timeout: 30 * 1000,
            type: "warning",
            action: {
              text: "Reload",
              onClick: () => {
                window.location.href = documentUrl(document);
              },
            },
          }
        );
      }
    }

    if (document.injectTemplate) {
      document.injectTemplate = false;
      this.title = document.title;
      this.isDirty = true;
    }
  }

  @keydown("m")
  goToMove(ev) {
    if (!this.props.readOnly) return;

    ev.preventDefault();
    const { document, abilities } = this.props;

    if (abilities.move) {
      this.props.history.push(documentMoveUrl(document));
    }
  }

  @keydown("e")
  goToEdit(ev) {
    if (!this.props.readOnly) return;

    ev.preventDefault();
    const { document, abilities } = this.props;

    if (abilities.update) {
      this.props.history.push(editDocumentUrl(document));
    }
  }

  @keydown("esc")
  goBack(ev) {
    if (this.props.readOnly) return;

    ev.preventDefault();
    this.props.history.goBack();
  }

  @keydown("h")
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

  @keydown(`${meta}+shift+p`)
  onPublish(ev) {
    ev.preventDefault();
    const { document } = this.props;
    if (document.publishedAt) return;
    this.onSave({ publish: true, done: true });
  }

  @keydown(`${meta}+ctrl+h`)
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

  onSave = async (
    options: {
      done?: boolean,
      publish?: boolean,
      autosave?: boolean,
    } = {}
  ) => {
    const { document } = this.props;

    // prevent saves when we are already saving
    if (document.isSaving) return;

    // get the latest version of the editor text value
    const text = this.getEditorText ? this.getEditorText() : document.text;
    const title = this.title;

    // prevent save before anything has been written (single hash is empty doc)
    if (text.trim() === "" && title.trim === "") return;

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

    try {
      const savedDocument = await document.save({
        ...options,
        lastRevision: this.lastRevision,
      });
      this.isDirty = false;
      this.lastRevision = savedDocument.revision;

      if (options.done) {
        this.props.history.push(savedDocument.url);
        this.props.ui.setActiveDocument(savedDocument);
      } else if (isNew) {
        this.props.history.push(editDocumentUrl(savedDocument));
        this.props.ui.setActiveDocument(savedDocument);
      }
    } catch (err) {
      this.props.ui.showToast(err.message, { type: "error" });
    } finally {
      this.isSaving = false;
      this.isPublishing = false;
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
    this.isEmpty = (!editorText || editorText === "#") && !this.title;
    this.isDirty = bodyChanged || titleChanged;
  };

  updateIsDirtyDebounced = debounce(this.updateIsDirty, IS_DIRTY_DELAY);

  onImageUploadStart = () => {
    this.isUploading = true;
  };

  onImageUploadStop = () => {
    this.isUploading = false;
  };

  onChange = (getEditorText) => {
    this.getEditorText = getEditorText;

    // document change while read only is presumed to be a checkbox edit,
    // in that case we don't delay in saving for a better user experience.
    if (this.props.readOnly) {
      this.updateIsDirty();
      this.onSave({ done: false, autosave: true });
    } else {
      this.updateIsDirtyDebounced();
      this.autosave();
    }
  };

  onChangeTitle = (event) => {
    this.title = event.target.value;
    this.updateIsDirtyDebounced();
    this.autosave();
  };

  goBack = () => {
    let url;
    if (this.props.document.url) {
      url = this.props.document.url;
    } else if (this.props.match.params.id) {
      url = collectionUrl(this.props.match.params.id);
    }
    if (url) {
      this.props.history.push(url);
    }
  };

  render() {
    const {
      document,
      revision,
      readOnly,
      abilities,
      auth,
      ui,
      match,
    } = this.props;
    const team = auth.team;
    const isShare = !!match.params.shareId;

    const value = revision ? revision.text : document.text;
    const injectTemplate = document.injectTemplate;
    const disableEmbeds =
      (team && team.documentEmbeds === false) || document.embedsDisabled;

    const headings = this.editor.current
      ? this.editor.current.getHeadings()
      : [];
    const showContents = ui.tocVisible && readOnly;

    return (
      <ErrorBoundary>
        <Background
          key={revision ? revision.id : document.id}
          isShare={isShare}
          column
          auto
        >
          <Route
            path={`${match.url}/move`}
            component={() => (
              <Modal
                title={`Move ${document.noun}`}
                onRequestClose={this.goBack}
                isOpen
              >
                <DocumentMove
                  document={document}
                  onRequestClose={this.goBack}
                />
              </Modal>
            )}
          />
          <PageTitle
            title={document.titleWithDefault.replace(document.emoji, "")}
            favicon={document.emoji ? emojiToUrl(document.emoji) : undefined}
          />
          {(this.isUploading || this.isSaving) && <LoadingIndicator />}

          <Container justify="center" column auto>
            {!readOnly && (
              <>
                <Prompt
                  when={this.isDirty && !this.isUploading}
                  message={DISCARD_CHANGES}
                />
                <Prompt
                  when={this.isUploading && !this.isDirty}
                  message={UPLOADING_WARNING}
                />
              </>
            )}
            <Header
              document={document}
              isShare={isShare}
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
            <MaxWidth
              archived={document.isArchived}
              showContents={showContents}
              column
              auto
            >
              {document.isTemplate && !readOnly && (
                <Notice muted>
                  You’re editing a template. Highlight some text and use the{" "}
                  <PlaceholderIcon color="currentColor" /> control to add
                  placeholders that can be filled out when creating new
                  documents from this template.
                </Notice>
              )}
              {document.archivedAt && !document.deletedAt && (
                <Notice muted>
                  Archived by {document.updatedBy.name}{" "}
                  <Time dateTime={document.archivedAt} /> ago
                </Notice>
              )}
              {document.deletedAt && (
                <Notice muted>
                  Deleted by {document.updatedBy.name}{" "}
                  <Time dateTime={document.deletedAt} /> ago
                  {document.permanentlyDeletedAt && (
                    <>
                      <br />
                      This {document.noun} will be permanently deleted in{" "}
                      <Time dateTime={document.permanentlyDeletedAt} /> unless
                      restored.
                    </>
                  )}
                </Notice>
              )}
              <React.Suspense fallback={<LoadingPlaceholder />}>
                <Flex auto={!readOnly}>
                  {showContents && <Contents headings={headings} />}
                  <Editor
                    id={document.id}
                    innerRef={this.editor}
                    isShare={isShare}
                    isDraft={document.isDraft}
                    template={document.isTemplate}
                    key={[injectTemplate, disableEmbeds].join("-")}
                    title={revision ? revision.title : this.title}
                    document={document}
                    value={readOnly ? value : undefined}
                    defaultValue={value}
                    disableEmbeds={disableEmbeds}
                    onImageUploadStart={this.onImageUploadStart}
                    onImageUploadStop={this.onImageUploadStop}
                    onSearchLink={this.props.onSearchLink}
                    onCreateLink={this.props.onCreateLink}
                    onChangeTitle={this.onChangeTitle}
                    onChange={this.onChange}
                    onSave={this.onSave}
                    onPublish={this.onPublish}
                    onCancel={this.goBack}
                    readOnly={readOnly}
                    readOnlyWriteCheckboxes={readOnly && abilities.update}
                    ui={this.props.ui}
                  >
                    {!isShare && !revision && (
                      <>
                        <MarkAsViewed document={document} />
                        <ReferencesWrapper isOnlyTitle={document.isOnlyTitle}>
                          <References document={document} />
                        </ReferencesWrapper>
                      </>
                    )}
                  </Editor>
                </Flex>
              </React.Suspense>
            </MaxWidth>
          </Container>
        </Background>
        {isShare && !isCustomDomain() && (
          <Branding href="//www.getoutline.com?ref=sharelink" />
        )}
        {!isShare && <KeyboardShortcutsButton />}
      </ErrorBoundary>
    );
  }
}

const PlaceholderIcon = styled(InputIcon)`
  position: relative;
  top: 6px;
`;

const Background = styled(Container)`
  background: ${(props) => props.theme.background};
  transition: ${(props) => props.theme.backgroundTransition};
`;

const ReferencesWrapper = styled("div")`
  margin-top: ${(props) => (props.isOnlyTitle ? -45 : 16)}px;

  @media print {
    display: none;
  }
`;

const MaxWidth = styled(Flex)`
  ${(props) =>
    props.archived && `* { color: ${props.theme.textSecondary} !important; } `};
  padding: 0 12px;
  max-width: 100vw;
  width: 100%;

  ${breakpoint("tablet")`	
    padding: 0 24px;
    margin: 4px auto 12px;
    max-width: calc(48px + ${(props) =>
      props.showContents ? "64em" : "46em"});
  `};

  ${breakpoint("desktopLarge")`
    max-width: calc(48px + 52em);
  `};
`;

export default withRouter(
  inject("ui", "auth", "policies", "revisions")(DocumentScene)
);
