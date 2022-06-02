import { debounce } from "lodash";
import { action, observable } from "mobx";
import { observer } from "mobx-react";
import { AllSelection } from "prosemirror-state";
import * as React from "react";
import { WithTranslation, withTranslation } from "react-i18next";
import {
  Prompt,
  Route,
  RouteComponentProps,
  StaticContext,
  withRouter,
  Redirect,
} from "react-router";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { Heading } from "@shared/editor/lib/getHeadings";
import { parseDomain } from "@shared/utils/domains";
import getTasks from "@shared/utils/getTasks";
import RootStore from "~/stores/RootStore";
import Document from "~/models/Document";
import Revision from "~/models/Revision";
import DocumentMove from "~/scenes/DocumentMove";
import Branding from "~/components/Branding";
import ConnectionStatus from "~/components/ConnectionStatus";
import ErrorBoundary from "~/components/ErrorBoundary";
import Flex from "~/components/Flex";
import LoadingIndicator from "~/components/LoadingIndicator";
import Modal from "~/components/Modal";
import PageTitle from "~/components/PageTitle";
import PlaceholderDocument from "~/components/PlaceholderDocument";
import RegisterKeyDown from "~/components/RegisterKeyDown";
import withStores from "~/components/withStores";
import type { Editor as TEditor } from "~/editor";
import { NavigationNode } from "~/types";
import { client } from "~/utils/ApiClient";
import { emojiToUrl } from "~/utils/emoji";
import { isModKey } from "~/utils/keyboard";
import {
  documentMoveUrl,
  documentHistoryUrl,
  editDocumentUrl,
  documentUrl,
  updateDocumentUrl,
} from "~/utils/routeHelpers";
import Container from "./Container";
import Contents from "./Contents";
import Editor from "./Editor";
import Header from "./Header";
import KeyboardShortcutsButton from "./KeyboardShortcutsButton";
import MarkAsViewed from "./MarkAsViewed";
import Notices from "./Notices";
import PublicReferences from "./PublicReferences";
import References from "./References";

const AUTOSAVE_DELAY = 3000;

type Props = WithTranslation &
  RootStore &
  RouteComponentProps<
    Record<string, string>,
    StaticContext,
    { restore?: boolean; revisionId?: string }
  > & {
    sharedTree?: NavigationNode;
    abilities: Record<string, any>;
    document: Document;
    revision?: Revision;
    readOnly: boolean;
    shareId?: string;
    onCreateLink?: (title: string) => Promise<string>;
    onSearchLink?: (term: string) => any;
  };

@observer
class DocumentScene extends React.Component<Props> {
  @observable
  editor: TEditor | null;

  @observable
  isUploading = false;

  @observable
  isSaving = false;

  @observable
  isPublishing = false;

  @observable
  isEditorDirty = false;

  @observable
  isEmpty = true;

  @observable
  lastRevision: number = this.props.document.revision;

  @observable
  title: string = this.props.document.title;

  @observable
  headings: Heading[] = [];

  getEditorText: () => string = () => this.props.document.text;

  componentDidMount() {
    this.updateIsDirty();
  }

  componentDidUpdate(prevProps: Props) {
    const { auth, document, t } = this.props;

    if (prevProps.readOnly && !this.props.readOnly) {
      this.updateIsDirty();
    }

    if (this.props.readOnly || auth.team?.collaborativeEditing) {
      this.lastRevision = document.revision;
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

  componentWillUnmount() {
    if (
      this.isEmpty &&
      this.props.document.createdBy.id === this.props.auth.user?.id &&
      this.props.document.isDraft &&
      this.props.document.isActive &&
      this.props.document.hasEmptyTitle &&
      this.props.document.isPersistedOnce
    ) {
      this.props.document.delete();
    }
  }

  replaceDocument = (template: Document | Revision) => {
    const editorRef = this.editor;

    if (!editorRef) {
      return;
    }

    const { view, parser } = editorRef;
    view.dispatch(
      view.state.tr
        .setSelection(new AllSelection(view.state.doc))
        .replaceSelectionWith(parser.parse(template.text))
    );

    this.isEditorDirty = true;

    if (template instanceof Document) {
      this.props.document.templateId = template.id;
    }

    if (!this.title) {
      this.title = template.title;
      this.props.document.title = template.title;
    }

    this.props.document.text = template.text;
    this.updateIsDirty();
    this.onSave({
      autosave: true,
      publish: false,
      done: false,
    });
  };

  onSynced = async () => {
    const { toasts, history, location, t } = this.props;
    const restore = location.state?.restore;
    const revisionId = location.state?.revisionId;
    const editorRef = this.editor;

    if (!editorRef || !restore) {
      return;
    }

    const response = await client.post("/revisions.info", {
      id: revisionId,
    });

    if (response) {
      this.replaceDocument(response.data);
      toasts.showToast(t("Document restored"));
      history.replace(this.props.document.url, history.location.state);
    }
  };

  goToMove = (ev: KeyboardEvent) => {
    if (!this.props.readOnly) {
      return;
    }
    ev.preventDefault();
    const { document, abilities } = this.props;

    if (abilities.move) {
      this.props.history.push(documentMoveUrl(document));
    }
  };

  goToEdit = (ev: KeyboardEvent) => {
    if (!this.props.readOnly) {
      return;
    }
    ev.preventDefault();
    const { document, abilities } = this.props;

    if (abilities.update) {
      this.props.history.push(editDocumentUrl(document));
    }
  };

  goToHistory = (ev: KeyboardEvent) => {
    if (!this.props.readOnly) {
      return;
    }
    if (ev.ctrlKey) {
      return;
    }
    ev.preventDefault();
    const { document, location } = this.props;

    if (location.pathname.endsWith("history")) {
      this.props.history.push(document.url);
    } else {
      this.props.history.push(documentHistoryUrl(document));
    }
  };

  onPublish = (ev: React.MouseEvent | KeyboardEvent) => {
    ev.preventDefault();
    const { document } = this.props;
    if (document.publishedAt) {
      return;
    }
    this.onSave({
      publish: true,
      done: true,
    });
  };

  onToggleTableOfContents = (ev: KeyboardEvent) => {
    if (!this.props.readOnly) {
      return;
    }
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
      done?: boolean;
      publish?: boolean;
      autosave?: boolean;
    } = {}
  ) => {
    const { document, auth } = this.props;
    // prevent saves when we are already saving
    if (document.isSaving) {
      return;
    }

    // get the latest version of the editor text value
    const text = this.getEditorText ? this.getEditorText() : document.text;

    // prevent save before anything has been written (single hash is empty doc)
    if (text.trim() === "" && document.title.trim() === "") {
      return;
    }

    document.text = text;
    document.tasks = getTasks(document.text);

    // prevent autosave if nothing has changed
    if (options.autosave && !this.isEditorDirty && !document.isDirty()) {
      return;
    }

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

      this.isEditorDirty = false;
      this.lastRevision = savedDocument.revision;

      if (options.done) {
        this.props.history.push(savedDocument.url);
        this.props.ui.setActiveDocument(savedDocument);
      } else if (document.isNew) {
        this.props.history.push(editDocumentUrl(savedDocument));
        this.props.ui.setActiveDocument(savedDocument);
      }
    } catch (err) {
      this.props.toasts.showToast(err.message, {
        type: "error",
      });
    } finally {
      this.isSaving = false;
      this.isPublishing = false;
    }
  };

  autosave = debounce(() => {
    this.onSave({
      done: false,
      autosave: true,
    });
  }, AUTOSAVE_DELAY);

  updateIsDirty = () => {
    const { document } = this.props;
    const editorText = this.getEditorText().trim();
    this.isEditorDirty = editorText !== document.text.trim();

    // a single hash is a doc with just an empty title
    this.isEmpty =
      (!editorText || editorText === "#" || editorText === "\\") && !this.title;
  };

  updateIsDirtyDebounced = debounce(this.updateIsDirty, 500);

  onFileUploadStart = () => {
    this.isUploading = true;
  };

  onFileUploadStop = () => {
    this.isUploading = false;
  };

  onChange = (getEditorText: () => string) => {
    const { document, auth } = this.props;
    this.getEditorText = getEditorText;

    // Keep headings in sync for table of contents
    const headings = this.editor?.getHeadings() ?? [];
    if (
      headings.map((h) => h.level + h.title).join("") !==
      this.headings.map((h) => h.level + h.title).join("")
    ) {
      this.headings = headings;
    }

    // Keep derived task list in sync
    const tasks = this.editor?.getTasks();
    const total = tasks?.length ?? 0;
    const completed = tasks?.filter((t) => t.completed).length ?? 0;
    document.updateTasks(total, completed);

    // If the multiplayer editor is enabled we're done here as changes are saved
    // through the persistence protocol. The rest of this method is legacy.
    if (auth.team?.collaborativeEditing) {
      return;
    }

    // document change while read only is presumed to be a checkbox edit,
    // in that case we don't delay in saving for a better user experience.
    if (this.props.readOnly) {
      this.updateIsDirty();
      this.onSave({
        done: false,
        autosave: true,
      });
    } else {
      this.updateIsDirtyDebounced();
      this.autosave();
    }
  };

  onChangeTitle = action((value: string) => {
    this.title = value;
    this.props.document.title = value;
    this.updateIsDirty();
    this.autosave();
  });

  goBack = () => {
    if (!this.props.readOnly) {
      this.props.history.push(this.props.document.url);
    }
  };

  handleRef = (ref: TEditor | null) => {
    this.editor = ref;
    this.headings = this.editor?.getHeadings() ?? [];
  };

  render() {
    const {
      document,
      revision,
      readOnly,
      abilities,
      auth,
      ui,
      shareId,
      t,
    } = this.props;
    const team = auth.team;
    const isShare = !!shareId;
    const value = revision ? revision.text : document.text;
    const embedsDisabled =
      (team && team.documentEmbeds === false) || document.embedsDisabled;

    const hasHeadings = this.headings.length > 0;
    const showContents =
      ui.tocVisible &&
      ((readOnly && hasHeadings) || team?.collaborativeEditing);
    const collaborativeEditing =
      team?.collaborativeEditing &&
      !document.isArchived &&
      !document.isDeleted &&
      !revision &&
      !isShare;

    const canonicalUrl = shareId
      ? this.props.match.url
      : updateDocumentUrl(this.props.match.url, document);

    return (
      <ErrorBoundary>
        {this.props.location.pathname !== canonicalUrl && (
          <Redirect
            to={{
              pathname: canonicalUrl,
              state: this.props.location.state,
              hash: this.props.location.hash,
            }}
          />
        )}
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
        <Background key={revision ? revision.id : document.id} column auto>
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
            title={document.titleWithDefault.replace(document.emoji || "", "")}
            favicon={document.emoji ? emojiToUrl(document.emoji) : undefined}
          />
          {(this.isUploading || this.isSaving) && <LoadingIndicator />}
          <Container justify="center" column auto>
            {!readOnly && (
              <>
                <Prompt
                  when={
                    this.isEditorDirty &&
                    !this.isUploading &&
                    !team?.collaborativeEditing
                  }
                  message={(location, action) => {
                    if (
                      // a URL replace matching the current document indicates a title change
                      // no guard is needed for this transition
                      action === "REPLACE" &&
                      location.pathname === editDocumentUrl(document)
                    ) {
                      return true;
                    }

                    return t(
                      `You have unsaved changes.\nAre you sure you want to discard them?`
                    ) as string;
                  }}
                />
                <Prompt
                  when={this.isUploading && !this.isEditorDirty}
                  message={t(
                    `Images are still uploading.\nAre you sure you want to discard them?`
                  )}
                />
              </>
            )}
            <Header
              document={document}
              documentHasHeadings={hasHeadings}
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
              onSelectTemplate={this.replaceDocument}
              onSave={this.onSave}
              headings={this.headings}
            />
            <MaxWidth
              archived={document.isArchived}
              showContents={showContents}
              isEditing={!readOnly}
              isFullWidth={document.fullWidth}
              column
              auto
            >
              <Notices document={document} readOnly={readOnly} />
              <React.Suspense fallback={<PlaceholderDocument />}>
                <Flex auto={!readOnly}>
                  {showContents && (
                    <Contents
                      headings={this.headings}
                      isFullWidth={document.fullWidth}
                    />
                  )}
                  <Editor
                    id={document.id}
                    key={embedsDisabled ? "disabled" : "enabled"}
                    ref={this.handleRef}
                    multiplayer={collaborativeEditing}
                    shareId={shareId}
                    isDraft={document.isDraft}
                    template={document.isTemplate}
                    title={revision ? revision.title : document.title}
                    document={document}
                    value={readOnly ? value : undefined}
                    defaultValue={value}
                    embedsDisabled={embedsDisabled}
                    onSynced={this.onSynced}
                    onFileUploadStart={this.onFileUploadStart}
                    onFileUploadStop={this.onFileUploadStop}
                    onSearchLink={this.props.onSearchLink}
                    onCreateLink={this.props.onCreateLink}
                    onChangeTitle={this.onChangeTitle}
                    onChange={this.onChange}
                    onSave={this.onSave}
                    onPublish={this.onPublish}
                    onCancel={this.goBack}
                    readOnly={readOnly}
                    readOnlyWriteCheckboxes={readOnly && abilities.update}
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
            {isShare && !parseDomain(window.location.origin).custom && (
              <Branding href="//www.getoutline.com?ref=sharelink" />
            )}
          </Container>
        </Background>
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

const Background = styled(Container)`
  background: ${(props) => props.theme.background};
  transition: ${(props) => props.theme.backgroundTransition};
`;

const ReferencesWrapper = styled.div<{ isOnlyTitle?: boolean }>`
  margin-top: ${(props) => (props.isOnlyTitle ? -45 : 16)}px;

  @media print {
    display: none;
  }
`;

type MaxWidthProps = {
  isEditing?: boolean;
  isFullWidth?: boolean;
  archived?: boolean;
  showContents?: boolean;
};

const MaxWidth = styled(Flex)<MaxWidthProps>`
  // Adds space to the gutter to make room for heading annotations
  padding: 0 32px;
  transition: padding 100ms;
  max-width: 100vw;
  width: 100%;

  padding-bottom: 16px;

  ${breakpoint("tablet")`
    padding: 0 44px;
    margin: 4px auto 12px;
    max-width: ${(props: MaxWidthProps) =>
      props.isFullWidth
        ? "100vw"
        : `calc(64px + 46em + ${props.showContents ? "256px" : "0px"});`}
  `};

  ${breakpoint("desktopLarge")`
    max-width: ${(props: MaxWidthProps) =>
      props.isFullWidth ? "100vw" : `calc(64px + 52em);`}
  `};
`;

export default withTranslation()(withStores(withRouter(DocumentScene)));
