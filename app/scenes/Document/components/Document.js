// @flow
import { debounce } from "lodash";
import { action, observable } from "mobx";
import { observer, inject } from "mobx-react";
import { InputIcon } from "outline-icons";
import { AllSelection } from "prosemirror-state";
import * as React from "react";
import { type TFunction, Trans, withTranslation } from "react-i18next";
import { Prompt, Route, withRouter } from "react-router-dom";
import type { RouterHistory, Match } from "react-router-dom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import getTasks from "shared/utils/getTasks";
import AuthStore from "stores/AuthStore";
import ToastsStore from "stores/ToastsStore";
import UiStore from "stores/UiStore";
import Document from "models/Document";
import Revision from "models/Revision";
import DocumentMove from "scenes/DocumentMove";
import Branding from "components/Branding";
import ConnectionStatus from "components/ConnectionStatus";
import ErrorBoundary from "components/ErrorBoundary";
import Flex from "components/Flex";
import LoadingIndicator from "components/LoadingIndicator";
import Modal from "components/Modal";
import Notice from "components/Notice";
import PageTitle from "components/PageTitle";
import PlaceholderDocument from "components/PlaceholderDocument";
import RegisterKeyDown from "components/RegisterKeyDown";
import Time from "components/Time";
import Container from "./Container";
import Contents from "./Contents";
import Editor from "./Editor";
import Header from "./Header";
import KeyboardShortcutsButton from "./KeyboardShortcutsButton";
import MarkAsViewed from "./MarkAsViewed";
import PublicReferences from "./PublicReferences";
import References from "./References";
import { type LocationWithState, type NavigationNode, type Theme } from "types";
import { client } from "utils/ApiClient";
import { isCustomDomain } from "utils/domains";
import { emojiToUrl } from "utils/emoji";
import { isModKey } from "utils/keyboard";
import {
  documentMoveUrl,
  documentHistoryUrl,
  editDocumentUrl,
  documentUrl,
} from "utils/routeHelpers";

const AUTOSAVE_DELAY = 3000;
const IS_DIRTY_DELAY = 500;
type Props = {
  match: Match,
  history: RouterHistory,
  location: LocationWithState,
  sharedTree: ?NavigationNode,
  abilities: Object,
  document: Document,
  revision: Revision,
  readOnly: boolean,
  onCreateLink: (title: string) => Promise<string>,
  onSearchLink: (term: string) => any,
  theme: Theme,
  auth: AuthStore,
  ui: UiStore,
  toasts: ToastsStore,
  t: TFunction,
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

  componentDidMount() {
    this.updateIsDirty();
  }

  componentDidUpdate(prevProps) {
    const { auth, document, t } = this.props;

    if (prevProps.readOnly && !this.props.readOnly) {
      this.updateIsDirty();
    }

    if (this.props.readOnly || auth.team?.collaborativeEditing) {
      this.lastRevision = document.revision;
    }

    if (this.props.readOnly) {
      if (document.title !== this.title) {
        this.title = document.title;
      }
    }

    if (
      !this.props.readOnly &&
      !auth.team?.collaborativeEditing &&
      prevProps.document.revision !== this.lastRevision
    ) {
      if (auth.user && document.updatedBy.id !== auth.user.id) {
        this.props.toasts.showToast(
          t(`Document updated by {{userName}}`, {
            userName: document.updatedBy.name,
          }),
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
  }

  replaceDocument = (template: Document | Revision) => {
    this.title = template.title;
    this.isDirty = true;

    const editorRef = this.editor.current;
    if (!editorRef) {
      return;
    }

    const { view, parser } = editorRef;
    view.dispatch(
      view.state.tr
        .setSelection(new AllSelection(view.state.doc))
        .replaceSelectionWith(parser.parse(template.text))
    );

    if (template instanceof Document) {
      this.props.document.templateId = template.id;
    }
    this.props.document.title = template.title;
    this.props.document.text = template.text;

    this.updateIsDirty();
  };

  onSynced = async () => {
    const { toasts, history, location, t } = this.props;
    const restore = location.state?.restore;
    const revisionId = location.state?.revisionId;

    const editorRef = this.editor.current;
    if (!editorRef || !restore) {
      return;
    }

    const response = await client.post("/revisions.info", {
      id: revisionId,
    });

    if (response) {
      this.replaceDocument(response.data);
      toasts.showToast(t("Document restored"));
      history.replace(this.props.document.url);
    }
  };

  goToMove = (ev) => {
    if (!this.props.readOnly) return;

    ev.preventDefault();
    const { document, abilities } = this.props;

    if (abilities.move) {
      this.props.history.push(documentMoveUrl(document));
    }
  };

  goToEdit = (ev) => {
    if (!this.props.readOnly) return;

    ev.preventDefault();
    const { document, abilities } = this.props;

    if (abilities.update) {
      this.props.history.push(editDocumentUrl(document));
    }
  };

  goBack = (ev) => {
    if (this.props.readOnly) return;

    ev.preventDefault();
    this.props.history.goBack();
  };

  goToHistory = (ev) => {
    if (!this.props.readOnly) return;
    if (ev.ctrlKey) return;

    ev.preventDefault();
    const { document, location } = this.props;

    if (location.pathname.endsWith("history")) {
      this.props.history.push(document.url);
    } else {
      this.props.history.push(documentHistoryUrl(document));
    }
  };

  onPublish = (ev) => {
    ev.preventDefault();
    const { document } = this.props;
    if (document.publishedAt) return;
    this.onSave({ publish: true, done: true });
  };

  onToggleTableOfContents = (ev) => {
    if (!this.props.readOnly) return;

    ev.preventDefault();
    const { ui } = this.props;

    if (ui.tocVisible) {
      ui.hideTableOfContents();
    } else {
      ui.showTableOfContents();
    }
  };

  onSave = async (
    options: {
      done?: boolean,
      publish?: boolean,
      autosave?: boolean,
    } = {}
  ) => {
    const { document, auth } = this.props;

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
    document.tasks = getTasks(document.text);

    let isNew = !document.id;
    this.isSaving = true;
    this.isPublishing = !!options.publish;

    try {
      let savedDocument = document;
      if (auth.team?.collaborativeEditing) {
        // update does not send "text" field to the API, this is a workaround
        // while the multiplayer editor is toggleable. Once it's finalized
        // this can be cleaned up to single code path
        savedDocument = await document.update({
          ...options,
          lastRevision: this.lastRevision,
        });
      } else {
        savedDocument = await document.save({
          ...options,
          lastRevision: this.lastRevision,
        });
      }

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
      this.props.toasts.showToast(err.message, { type: "error" });
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
    const { document, auth } = this.props;

    this.getEditorText = getEditorText;

    // If the multiplayer editor is enabled then we still want to keep the local
    // text value in sync as it is used as a cache.
    if (auth.team?.collaborativeEditing) {
      action(() => {
        document.text = this.getEditorText();
        document.tasks = getTasks(document.text);
      })();

      return;
    }

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

  onChangeTitle = (value) => {
    this.title = value;
    this.updateIsDirtyDebounced();
    this.autosave();
  };

  goBack = () => {
    this.props.history.push(this.props.document.url);
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
      t,
    } = this.props;
    const team = auth.team;
    const { shareId } = match.params;
    const isShare = !!shareId;

    const value = revision ? revision.text : document.text;
    const disableEmbeds =
      (team && team.documentEmbeds === false) || document.embedsDisabled;

    const headings = this.editor.current
      ? this.editor.current.getHeadings()
      : [];
    const showContents =
      ui.tocVisible && (readOnly || team?.collaborativeEditing);

    const collaborativeEditing =
      team?.collaborativeEditing &&
      !document.isArchived &&
      !document.isDeleted &&
      !revision &&
      !isShare;

    return (
      <ErrorBoundary>
        <RegisterKeyDown trigger="m" handler={this.goToMove} />
        <RegisterKeyDown trigger="e" handler={this.goToEdit} />
        <RegisterKeyDown trigger="Escape" handler={this.goBack} />
        <RegisterKeyDown trigger="h" handler={this.goToHistory} />
        <RegisterKeyDown
          trigger="p"
          handler={(event) => {
            if (isModKey(event) && event.shiftKey) {
              this.onPublish(event);
            }
          }}
        />
        <RegisterKeyDown
          trigger="h"
          handler={(event) => {
            if (event.ctrlKey && event.altKey) {
              this.onToggleTableOfContents(event);
            }
          }}
        />
        <Background
          key={revision ? revision.id : document.id}
          isShare={isShare}
          column
          auto
        >
          <Route
            path={`${document.url}/move`}
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
                  when={
                    this.isDirty &&
                    !this.isUploading &&
                    !team?.collaborativeEditing
                  }
                  message={t(
                    `You have unsaved changes.\nAre you sure you want to discard them?`
                  )}
                />
                <Prompt
                  when={this.isUploading && !this.isDirty}
                  message={t(
                    `Images are still uploading.\nAre you sure you want to discard them?`
                  )}
                />
              </>
            )}
            <Header
              document={document}
              shareId={shareId}
              isRevision={!!revision}
              isDraft={document.isDraft}
              isEditing={!readOnly && !team?.collaborativeEditing}
              isSaving={this.isSaving}
              isPublishing={this.isPublishing}
              publishingIsDisabled={
                document.isSaving || this.isPublishing || this.isEmpty
              }
              savingIsDisabled={document.isSaving || this.isEmpty}
              sharedTree={this.props.sharedTree}
              goBack={this.goBack}
              onSelectTemplate={this.replaceDocument}
              onSave={this.onSave}
              headings={headings}
            />
            <MaxWidth
              archived={document.isArchived}
              showContents={showContents}
              isEditing={!readOnly}
              column
              auto
            >
              {document.isTemplate && !readOnly && (
                <Notice muted>
                  <Trans>
                    You’re editing a template. Highlight some text and use the{" "}
                    <PlaceholderIcon color="currentColor" /> control to add
                    placeholders that can be filled out when creating new
                    documents from this template.
                  </Trans>
                </Notice>
              )}
              {document.archivedAt && !document.deletedAt && (
                <Notice muted>
                  {t("Archived by {{userName}}", {
                    userName: document.updatedBy.name,
                  })}{" "}
                  <Time dateTime={document.updatedAt} addSuffix />
                </Notice>
              )}
              {document.deletedAt && (
                <Notice muted>
                  <strong>
                    {t("Deleted by {{userName}}", {
                      userName: document.updatedBy.name,
                    })}{" "}
                    <Time dateTime={document.deletedAt || ""} addSuffix />
                  </strong>
                  {document.permanentlyDeletedAt && (
                    <>
                      <br />
                      {document.template ? (
                        <Trans>
                          This template will be permanently deleted in{" "}
                          <Time dateTime={document.permanentlyDeletedAt} />{" "}
                          unless restored.
                        </Trans>
                      ) : (
                        <Trans>
                          This document will be permanently deleted in{" "}
                          <Time dateTime={document.permanentlyDeletedAt} />{" "}
                          unless restored.
                        </Trans>
                      )}
                    </>
                  )}
                </Notice>
              )}
              <React.Suspense fallback={<PlaceholderDocument />}>
                <Flex auto={!readOnly}>
                  {showContents && <Contents headings={headings} />}
                  <Editor
                    id={document.id}
                    key={disableEmbeds ? "disabled" : "enabled"}
                    innerRef={this.editor}
                    multiplayer={collaborativeEditing}
                    shareId={shareId}
                    isDraft={document.isDraft}
                    template={document.isTemplate}
                    title={revision ? revision.title : this.title}
                    document={document}
                    value={readOnly ? value : undefined}
                    defaultValue={value}
                    disableEmbeds={disableEmbeds}
                    onSynced={this.onSynced}
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
                    {shareId && (
                      <ReferencesWrapper isOnlyTitle={document.isOnlyTitle}>
                        <PublicReferences
                          shareId={shareId}
                          documentId={document.id}
                          sharedTree={this.props.sharedTree}
                        />
                      </ReferencesWrapper>
                    )}
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
        {!isShare && (
          <>
            <KeyboardShortcutsButton />
            <ConnectionStatus />
          </>
        )}
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

  // Adds space to the left gutter to make room for heading annotations on mobile
  padding: ${(props) => (props.isEditing ? "0 12px 0 32px" : "0 12px")};
  transition: padding 100ms;

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
  withTranslation()<DocumentScene>(
    inject("ui", "auth", "toasts")(DocumentScene)
  )
);
