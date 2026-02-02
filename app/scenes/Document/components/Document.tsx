import cloneDeep from "lodash/cloneDeep";
import debounce from "lodash/debounce";
import isEqual from "lodash/isEqual";
import { action, observable } from "mobx";
import { observer } from "mobx-react";
import { Node } from "prosemirror-model";
import type { Selection } from "prosemirror-state";
import { AllSelection, TextSelection } from "prosemirror-state";
import * as React from "react";
import type { WithTranslation } from "react-i18next";
import { withTranslation } from "react-i18next";
import type { RouteComponentProps, StaticContext } from "react-router";
import { Prompt, withRouter, Redirect } from "react-router";
import { toast } from "sonner";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";
import { s } from "@shared/styles";
import type { NavigationNode } from "@shared/types";
import { IconType, TOCPosition, TeamPreference } from "@shared/types";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { TextHelper } from "@shared/utils/TextHelper";
import { determineIconType } from "@shared/utils/icon";
import { isModKey } from "@shared/utils/keyboard";
import type RootStore from "~/stores/RootStore";
import Document from "~/models/Document";
import type Revision from "~/models/Revision";
import DocumentMove from "~/scenes/DocumentMove";
import DocumentPublish from "~/scenes/DocumentPublish";
import ErrorBoundary from "~/components/ErrorBoundary";
import LoadingIndicator from "~/components/LoadingIndicator";
import PageTitle from "~/components/PageTitle";
import PlaceholderDocument from "~/components/PlaceholderDocument";
import RegisterKeyDown from "~/components/RegisterKeyDown";
import type { SidebarContextType } from "~/components/Sidebar/components/SidebarContext";
import withStores from "~/components/withStores";
import { MeasuredContainer } from "~/components/MeasuredContainer";
import type { Editor as TEditor } from "~/editor";
import type { Properties } from "~/types";
import { client } from "~/utils/ApiClient";
import { emojiToUrl } from "~/utils/emoji";
import {
  documentHistoryPath,
  documentEditPath,
  updateDocumentPath,
} from "~/utils/routeHelpers";
import Container from "./Container";
import Contents from "./Contents";
import Editor from "./Editor";
import Header from "./Header";
import Notices from "./Notices";
import References from "./References";
import RevisionViewer from "./RevisionViewer";

const AUTOSAVE_DELAY = 3000;

type Params = {
  documentSlug: string;
  revisionId?: string;
  shareId?: string;
};

type LocationState = {
  title?: string;
  restore?: boolean;
  revisionId?: string;
  sidebarContext?: SidebarContextType;
};

type Props = WithTranslation &
  RootStore &
  RouteComponentProps<Params, StaticContext, LocationState> & {
    sharedTree?: NavigationNode;
    abilities: Record<string, boolean>;
    document: Document;
    revision?: Revision;
    readOnly: boolean;
    shareId?: string;
    tocPosition?: TOCPosition | false;
    onCreateLink?: (
      params: Properties<Document>,
      nested?: boolean
    ) => Promise<string>;
  };

@observer
class DocumentScene extends React.Component<Props> {
  @observable
  editor = React.createRef<TEditor>();

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
  title: string = this.props.document.title;

  componentDidMount() {
    this.updateIsDirty();
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.readOnly && !this.props.readOnly) {
      this.updateIsDirty();
    }
  }

  componentWillUnmount() {
    if (
      this.isEmpty &&
      this.props.document.createdBy?.id === this.props.auth.user?.id &&
      this.props.document.isDraft &&
      this.props.document.isActive &&
      this.props.document.hasEmptyTitle &&
      this.props.document.isPersistedOnce
    ) {
      void this.props.document.delete();
    } else if (this.props.document.isDirty()) {
      void this.props.document.save(undefined, {
        autosave: true,
      });
    }
  }

  /**
   * Replaces the given selection with a template, if no selection is provided
   * then the template is inserted at the beginning of the document.
   *
   * @param template The template to use
   * @param selection The selection to replace, if any
   */
  replaceSelection = (template: Document | Revision, selection?: Selection) => {
    const editorRef = this.editor.current;

    if (!editorRef) {
      return;
    }

    const { view, schema } = editorRef;
    const sel = selection ?? TextSelection.near(view.state.doc.resolve(0));
    const doc = Node.fromJSON(
      schema,
      ProsemirrorHelper.replaceTemplateVariables(
        template.data,
        this.props.auth.user!
      )
    );

    if (doc) {
      view.dispatch(view.state.tr.setSelection(sel).replaceSelectionWith(doc));
    }

    this.isEditorDirty = true;

    if (template instanceof Document) {
      this.props.document.templateId = template.id;
      this.props.document.fullWidth = template.fullWidth;
    }

    if (!this.title) {
      const title = TextHelper.replaceTemplateVariables(
        template.title,
        this.props.auth.user!
      );
      this.title = title;
      this.props.document.title = title;
    }
    if (template.icon) {
      this.props.document.icon = template.icon;
    }
    if (template.color) {
      this.props.document.color = template.color;
    }

    this.props.document.data = cloneDeep(template.data);
    this.updateIsDirty();

    return this.onSave({
      autosave: true,
      publish: false,
      done: false,
    });
  };

  onSynced = async () => {
    const { history, location, t } = this.props;
    const restore = location.state?.restore;
    const revisionId = location.state?.revisionId;
    const editorRef = this.editor.current;

    if (!editorRef) {
      return;
    }

    // Highlight search term when navigating from search results
    const params = new URLSearchParams(location.search);
    const searchTerm = params.get("q");
    if (searchTerm) {
      editorRef.commands.find({ text: searchTerm });
    }

    if (!restore) {
      return;
    }

    const response = await client.post("/revisions.info", {
      id: revisionId,
    });

    if (response) {
      await this.replaceSelection(
        response.data,
        new AllSelection(editorRef.view.state.doc)
      );
      toast.success(t("Document restored"));
      history.replace(this.props.document.url, history.location.state);
    }
  };

  onUndoRedo = (event: KeyboardEvent) => {
    if (isModKey(event)) {
      event.preventDefault();

      if (event.shiftKey) {
        if (!this.props.readOnly) {
          this.editor.current?.commands.redo();
        }
      } else {
        if (!this.props.readOnly) {
          this.editor.current?.commands.undo();
        }
      }
    }
  };

  onMove = (ev: React.MouseEvent | KeyboardEvent) => {
    ev.preventDefault();
    const { document, dialogs, t, abilities } = this.props;
    if (abilities.move) {
      dialogs.openModal({
        title: t("Move document"),
        content: <DocumentMove document={document} />,
      });
    }
  };

  goToEdit = (ev: KeyboardEvent) => {
    if (this.props.readOnly) {
      ev.preventDefault();
      const { document, abilities } = this.props;

      if (abilities.update) {
        this.props.history.push({
          pathname: documentEditPath(document),
          state: { sidebarContext: this.props.location.state?.sidebarContext },
        });
      }
    } else if (this.editor.current?.isBlurred) {
      ev.preventDefault();
      this.editor.current?.focus();
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
      this.props.history.push({
        pathname: document.url,
        state: { sidebarContext: this.props.location.state?.sidebarContext },
      });
    } else {
      this.props.history.push({
        pathname: documentHistoryPath(document),
        state: { sidebarContext: this.props.location.state?.sidebarContext },
      });
    }
  };

  onPublish = (ev: React.MouseEvent | KeyboardEvent) => {
    ev.preventDefault();
    ev.stopPropagation();

    const { document, dialogs, t } = this.props;
    if (document.publishedAt) {
      return;
    }

    if (document?.collectionId) {
      void this.onSave({
        publish: true,
        done: true,
      });
    } else {
      dialogs.openModal({
        title: t("Publish document"),
        content: <DocumentPublish document={document} />,
      });
    }
  };

  onSave = async (
    options: {
      done?: boolean;
      publish?: boolean;
      autosave?: boolean;
    } = {}
  ) => {
    const { document } = this.props;
    // prevent saves when we are already saving
    if (document.isSaving) {
      return;
    }

    // get the latest version of the editor text value
    const doc = this.editor.current?.view.state.doc;
    if (!doc) {
      return;
    }

    // prevent save before anything has been written (single hash is empty doc)
    if (ProsemirrorHelper.isEmpty(doc) && document.title.trim() === "") {
      return;
    }

    document.data = doc.toJSON();
    document.tasks = ProsemirrorHelper.getTasksSummary(doc);

    // prevent autosave if nothing has changed
    if (options.autosave && !this.isEditorDirty && !document.isDirty()) {
      return;
    }

    this.isSaving = true;
    this.isPublishing = !!options.publish;

    try {
      const savedDocument = await document.save(undefined, options);
      this.isEditorDirty = false;

      if (options.done) {
        this.props.history.push({
          pathname: savedDocument.url,
          state: { sidebarContext: this.props.location.state?.sidebarContext },
        });
        this.props.ui.setActiveDocument(savedDocument);
      } else if (document.isNew) {
        this.props.history.push({
          pathname: documentEditPath(savedDocument),
          state: { sidebarContext: this.props.location.state?.sidebarContext },
        });
        this.props.ui.setActiveDocument(savedDocument);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      this.isSaving = false;
      this.isPublishing = false;
    }
  };

  autosave = debounce(
    () =>
      this.onSave({
        done: false,
        autosave: true,
      }),
    AUTOSAVE_DELAY
  );

  updateIsDirty = action(() => {
    const { document } = this.props;
    const doc = this.editor.current?.view.state.doc;

    this.isEditorDirty = !isEqual(doc?.toJSON(), document.data);
    this.isEmpty = (!doc || ProsemirrorHelper.isEmpty(doc)) && !this.title;
  });

  updateIsDirtyDebounced = debounce(this.updateIsDirty, 500);

  onFileUploadStart = action(() => {
    this.isUploading = true;
  });

  onFileUploadStop = action(() => {
    this.isUploading = false;
  });

  handleChangeTitle = action((value: string) => {
    this.title = value;
    this.props.document.title = value;
    this.updateIsDirty();
    void this.autosave();
  });

  handleChangeIcon = action((icon: string | null, color: string | null) => {
    this.props.document.icon = icon;
    this.props.document.color = color;
    void this.onSave();
  });

  handleSelectTemplate = async (template: Document | Revision) => {
    const editorRef = this.editor.current;
    if (!editorRef) {
      return;
    }

    const { view } = editorRef;
    const doc = view.state.doc;

    return this.replaceSelection(
      template,
      ProsemirrorHelper.isEmpty(doc)
        ? new AllSelection(doc)
        : view.state.selection
    );
  };

  goBack = () => {
    if (!this.props.readOnly) {
      this.props.history.push({
        pathname: this.props.document.url,
        state: { sidebarContext: this.props.location.state?.sidebarContext },
      });
    }
  };

  render() {
    const {
      children,
      document,
      revision,
      readOnly,
      abilities,
      auth,
      ui,
      shareId,
      tocPosition,
      t,
    } = this.props;
    const { team, user } = auth;
    const isShare = !!shareId;
    const embedsDisabled =
      (team && team.documentEmbeds === false) || document.embedsDisabled;

    const tocPos =
      tocPosition ??
      ((team?.getPreference(TeamPreference.TocPosition) as TOCPosition) ||
        TOCPosition.Left);
    const showContents =
      tocPos &&
      (isShare
        ? ui.tocVisible !== false
        : !document.isTemplate && ui.tocVisible === true);
    const tocOffset =
      tocPos === TOCPosition.Left
        ? EditorStyleHelper.tocWidth / -2
        : EditorStyleHelper.tocWidth / 2;

    const multiplayerEditor =
      !document.isArchived && !document.isDeleted && !revision && !isShare;

    const canonicalUrl = shareId
      ? this.props.match.url
      : updateDocumentPath(this.props.match.url, document);

    const hasEmojiInTitle = determineIconType(document.icon) === IconType.Emoji;
    const title = hasEmojiInTitle
      ? document.titleWithDefault.replace(document.icon!, "")
      : document.titleWithDefault;
    const favicon = hasEmojiInTitle ? emojiToUrl(document.icon!) : undefined;

    const fullWidthTransformOffsetStyle = {
      ["--full-width-transform-offset"]: `${document.fullWidth && showContents ? tocOffset : 0}px`,
    } as React.CSSProperties;

    return (
      <ErrorBoundary showTitle>
        {this.props.location.pathname !== canonicalUrl && (
          <Redirect
            to={{
              pathname: canonicalUrl,
              state: this.props.location.state,
              hash: this.props.location.hash,
            }}
          />
        )}
        <RegisterKeyDown trigger="m" handler={this.onMove} />
        <RegisterKeyDown trigger="z" handler={this.onUndoRedo} />
        <RegisterKeyDown trigger="e" handler={this.goToEdit} />
        <RegisterKeyDown trigger="Escape" handler={this.goBack} />
        <RegisterKeyDown trigger="h" handler={this.goToHistory} />
        <RegisterKeyDown
          trigger="p"
          options={{
            allowInInput: true,
          }}
          handler={(event) => {
            if (isModKey(event) && event.shiftKey) {
              this.onPublish(event);
            }
          }}
        />
        <MeasuredContainer
          as={Background}
          name="container"
          key={revision ? revision.id : document.id}
          column
          auto
        >
          <PageTitle title={title} favicon={favicon} />
          {(this.isUploading || this.isSaving) && <LoadingIndicator />}
          <Container column>
            {!readOnly && (
              <Prompt
                when={this.isUploading && !this.isEditorDirty}
                message={t(
                  `Images are still uploading.\nAre you sure you want to discard them?`
                )}
              />
            )}
            <Header
              editorRef={this.editor}
              document={document}
              revision={revision}
              isDraft={document.isDraft}
              isEditing={!readOnly && !!user?.separateEditMode}
              isSaving={this.isSaving}
              isPublishing={this.isPublishing}
              publishingIsDisabled={
                document.isSaving || this.isPublishing || this.isEmpty
              }
              savingIsDisabled={document.isSaving || this.isEmpty}
              onSelectTemplate={this.handleSelectTemplate}
              onSave={this.onSave}
            />
            <Main
              fullWidth={document.fullWidth}
              tocPosition={tocPos}
              style={fullWidthTransformOffsetStyle}
            >
              <React.Suspense
                fallback={
                  <EditorContainer
                    docFullWidth={document.fullWidth}
                    showContents={showContents}
                    tocPosition={tocPos}
                  >
                    <PlaceholderDocument />
                  </EditorContainer>
                }
              >
                <MeasuredContainer
                  name="document"
                  as={EditorContainer}
                  docFullWidth={document.fullWidth}
                  showContents={showContents}
                  tocPosition={tocPos}
                >
                  {revision ? (
                    <RevisionViewer
                      ref={this.editor}
                      document={document}
                      revision={revision}
                      id={revision.id}
                    />
                  ) : (
                    <>
                      <Notices document={document} readOnly={readOnly} />

                      {showContents && (
                        <PrintContentsContainer>
                          <Contents />
                        </PrintContentsContainer>
                      )}
                      <Editor
                        id={document.id}
                        key={embedsDisabled ? "disabled" : "enabled"}
                        ref={this.editor}
                        multiplayer={multiplayerEditor}
                        isDraft={document.isDraft}
                        template={document.isTemplate}
                        document={document}
                        value={readOnly ? document.data : undefined}
                        defaultValue={document.data}
                        embedsDisabled={embedsDisabled}
                        onSynced={this.onSynced}
                        onFileUploadStart={this.onFileUploadStart}
                        onFileUploadStop={this.onFileUploadStop}
                        onCreateLink={this.props.onCreateLink}
                        onChangeTitle={this.handleChangeTitle}
                        onChangeIcon={this.handleChangeIcon}
                        onSave={this.onSave}
                        onPublish={this.onPublish}
                        onCancel={this.goBack}
                        readOnly={readOnly}
                        canUpdate={abilities.update}
                        canComment={abilities.comment}
                        autoFocus={document.createdAt === document.updatedAt}
                      >
                        {!revision && (
                          <ReferencesWrapper>
                            <References document={document} />
                          </ReferencesWrapper>
                        )}
                      </Editor>
                    </>
                  )}
                </MeasuredContainer>
                {showContents && (
                  <ContentsContainer
                    docFullWidth={document.fullWidth}
                    position={tocPos}
                  >
                    <Contents />
                  </ContentsContainer>
                )}
              </React.Suspense>
            </Main>
            {children}
          </Container>
        </MeasuredContainer>
      </ErrorBoundary>
    );
  }
}

type MainProps = {
  fullWidth: boolean;
  tocPosition: TOCPosition | false;
};

const Main = styled.div<MainProps>`
  margin-top: 4px;

  ${breakpoint("tablet")`
    display: grid;
    grid-template-columns: ${({ fullWidth, tocPosition }: MainProps) =>
      fullWidth
        ? tocPosition === TOCPosition.Left
          ? `${EditorStyleHelper.tocWidth}px minmax(0, 1fr)`
          : `minmax(0, 1fr) ${EditorStyleHelper.tocWidth}px`
        : `1fr minmax(0, ${`calc(46em + ${EditorStyleHelper.documentGutter})`}) 1fr`};
  `};

  ${breakpoint("desktopLarge")`
    grid-template-columns: ${({ fullWidth, tocPosition }: MainProps) =>
      fullWidth
        ? tocPosition === TOCPosition.Left
          ? `${EditorStyleHelper.tocWidth}px minmax(0, 1fr)`
          : `minmax(0, 1fr) ${EditorStyleHelper.tocWidth}px`
        : `1fr minmax(0, ${`calc(${EditorStyleHelper.documentWidth} + ${EditorStyleHelper.documentGutter})`}) 1fr`};
  `};

  @media print {
    display: block;
    max-width: calc(
      ${EditorStyleHelper.documentWidth} + ${EditorStyleHelper.documentGutter}
    );
  }
`;

type ContentsContainerProps = {
  docFullWidth: boolean;
  position: TOCPosition | false;
};

const ContentsContainer = styled.div<ContentsContainerProps>`
  ${breakpoint("tablet")`
    margin-top: calc(44px + 6vh);

    grid-row: 1;
    grid-column: ${({ docFullWidth, position }: ContentsContainerProps) =>
      position === TOCPosition.Left ? 1 : docFullWidth ? 2 : 3};
    justify-self: ${({ position }: ContentsContainerProps) =>
      position === TOCPosition.Left ? "end" : "start"};
  `};

  @media print {
    display: none;
  }
`;

const PrintContentsContainer = styled.div`
  display: none;
  margin: 0 -12px;

  @media print {
    display: block;
  }
`;

type EditorContainerProps = {
  docFullWidth: boolean;
  showContents: boolean;
  tocPosition: TOCPosition | false;
};

const EditorContainer = styled.div<EditorContainerProps>`
  // Adds space to the gutter to make room for icon & heading annotations
  padding: 0 44px;

  ${breakpoint("tablet")`
    grid-row: 1;

    // Decides the editor column position & span
    grid-column: ${({
      docFullWidth,
      showContents,
      tocPosition,
    }: EditorContainerProps) =>
      docFullWidth
        ? showContents
          ? tocPosition === TOCPosition.Left
            ? 2
            : 1
          : "1 / -1"
        : 2};
  `};
`;

const Background = styled(Container)`
  position: relative;
  background: ${s("background")};
`;

const ReferencesWrapper = styled.div`
  margin: 12px 0 60px;

  ${breakpoint("tablet")`
    margin-bottom: 12px;
  `}

  @media print {
    display: none;
  }
`;

export default withTranslation()(withStores(withRouter(DocumentScene)));
