import { observer } from "mobx-react";
import { AllSelection } from "prosemirror-state";
import { useRef, useCallback } from "react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Prompt, useHistory, useLocation } from "react-router-dom";
import { toast } from "sonner";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";
import { s } from "@shared/styles";
import type { NavigationNode } from "@shared/types";
import { IconType, TOCPosition, TeamPreference } from "@shared/types";
import { determineIconType } from "@shared/utils/icon";
import { isModKey } from "@shared/utils/keyboard";
import type Document from "~/models/Document";
import type Revision from "~/models/Revision";
import DocumentMove from "~/components/DocumentExplorer/DocumentMove";
import DocumentPublish from "~/scenes/DocumentPublish";
import ErrorBoundary from "~/components/ErrorBoundary";
import LoadingIndicator from "~/components/LoadingIndicator";
import PageTitle from "~/components/PageTitle";
import PlaceholderDocument from "~/components/PlaceholderDocument";
import RegisterKeyDown from "~/components/RegisterKeyDown";
import { MeasuredContainer } from "~/components/MeasuredContainer";
import type { Editor as TEditor } from "~/editor";
import type { Properties } from "~/types";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import useStores from "~/hooks/useStores";
import { client } from "~/utils/ApiClient";
import { emojiToUrl } from "~/utils/emoji";
import { documentHistoryPath, documentEditPath } from "~/utils/routeHelpers";
import { useDocumentSave } from "../hooks/useDocumentSave";
import Container from "./Container";
import Contents from "./Contents";
import Editor from "./Editor";
import Header from "./Header";
import Notices from "./Notices";
import References from "./References";
import RevisionViewer from "./RevisionViewer";

type LocationState = {
  title?: string;
  restore?: boolean;
  revisionId?: string;
};

interface Props {
  /** Tree of navigation nodes for shared documents. */
  sharedTree?: NavigationNode;
  /** Map of ability names to booleans representing current user permissions. */
  abilities: Record<string, boolean>;
  /** The document model being viewed or edited. */
  document: Document;
  /** An optional revision to display instead of the live document. */
  revision?: Revision;
  /** Whether the document is in read-only mode. */
  readOnly: boolean;
  /** The share ID when viewing a publicly shared document. */
  shareId?: string;
  /** Override for the table of contents position, or false to hide it. */
  tocPosition?: TOCPosition | false;
  /** Callback to create a linked document from the editor. */
  onCreateLink?: (
    params: Properties<Document>,
    nested?: boolean
  ) => Promise<string>;
  /** Optional children rendered after the main document content. */
  children?: React.ReactNode;
}

/** Scene component responsible for rendering and interacting with a document. */
function DocumentScene({
  document,
  revision,
  readOnly,
  abilities,
  shareId,
  tocPosition,
  onCreateLink,
  children,
}: Props) {
  const { auth, ui, dialogs } = useStores();
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation<LocationState>();
  const sidebarContext = useLocationSidebarContext();
  const { team, user } = auth;

  const editorRef = useRef<TEditor>(null);

  const {
    isUploading,
    isSaving,
    isPublishing,
    isEditorDirty,
    isEmpty,
    onSave,
    replaceSelection,
    handleSelectTemplate,
    handleChangeTitle,
    handleChangeIcon,
    onFileUploadStart,
    onFileUploadStop,
  } = useDocumentSave({ document, editorRef, readOnly });

  const onSynced = useCallback(async () => {
    const restore = location.state?.restore;
    const revisionId = location.state?.revisionId;
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    // Highlight search term when navigating from search results
    const params = new URLSearchParams(location.search);
    const searchTerm = params.get("q");
    if (searchTerm) {
      editor.commands.find({ text: searchTerm });
    }

    if (!restore) {
      return;
    }

    const response = await client.post("/revisions.info", {
      id: revisionId,
    });

    if (response) {
      await replaceSelection(
        response.data,
        new AllSelection(editor.view.state.doc)
      );
      toast.success(t("Document restored"));
      history.replace(document.url, history.location.state);
    }
  }, [location, replaceSelection, t, history, document.url]);

  const onUndoRedo = useCallback(
    (event: KeyboardEvent) => {
      if (isModKey(event)) {
        event.preventDefault();

        if (event.shiftKey) {
          if (!readOnly) {
            editorRef.current?.commands.redo();
          }
        } else {
          if (!readOnly) {
            editorRef.current?.commands.undo();
          }
        }
      }
    },
    [readOnly]
  );

  const onMove = useCallback(
    (ev: React.MouseEvent | KeyboardEvent) => {
      ev.preventDefault();
      if (abilities.move) {
        dialogs.openModal({
          title: t("Move document"),
          content: <DocumentMove document={document} />,
        });
      }
    },
    [document, dialogs, t, abilities.move]
  );

  const goToEdit = useCallback(
    (ev: KeyboardEvent) => {
      if (readOnly) {
        ev.preventDefault();
        if (abilities.update) {
          history.push({
            pathname: documentEditPath(document),
            state: { sidebarContext },
          });
        }
      } else if (editorRef.current?.isBlurred) {
        ev.preventDefault();
        editorRef.current?.focus();
      }
    },
    [readOnly, abilities.update, history, document, sidebarContext]
  );

  const goToHistory = useCallback(
    (ev: KeyboardEvent) => {
      if (!readOnly) {
        return;
      }
      if (ev.ctrlKey) {
        return;
      }
      ev.preventDefault();

      if (location.pathname.endsWith("history")) {
        history.push({
          pathname: document.path,
          state: { sidebarContext },
        });
      } else {
        history.push({
          pathname: documentHistoryPath(document),
          state: { sidebarContext },
        });
      }
    },
    [readOnly, location.pathname, history, document, sidebarContext]
  );

  const onPublish = useCallback(
    (ev: React.MouseEvent | KeyboardEvent) => {
      ev.preventDefault();
      ev.stopPropagation();

      if (document.publishedAt) {
        return;
      }

      if (document?.collectionId) {
        void onSave({
          publish: true,
          done: true,
        });
      } else {
        dialogs.openModal({
          title: t("Publish document"),
          content: <DocumentPublish document={document} />,
        });
      }
    },
    [document, dialogs, t, onSave]
  );

  const handlePublishShortcut = useCallback(
    (event: KeyboardEvent) => {
      if (isModKey(event) && event.shiftKey) {
        onPublish(event);
      }
    },
    [onPublish]
  );

  const goBack = useCallback(() => {
    if (!readOnly) {
      history.push({
        pathname: document.url,
        state: { sidebarContext },
      });
    }
  }, [readOnly, history, document, sidebarContext]);

  // Render
  const isShare = !!shareId;
  const embedsDisabled =
    (team && team.documentEmbeds === false) || document.embedsDisabled;

  const tocPos =
    tocPosition ??
    ((team?.getPreference(TeamPreference.TocPosition) as TOCPosition) ||
      TOCPosition.Left);
  const showContents =
    tocPos && (isShare ? ui.tocVisible !== false : ui.tocVisible === true);
  const tocOffset =
    tocPos === TOCPosition.Left
      ? EditorStyleHelper.tocWidth / -2
      : EditorStyleHelper.tocWidth / 2;

  const multiplayerEditor =
    !document.isArchived && !document.isDeleted && !revision && !isShare;

  const hasEmojiInTitle = determineIconType(document.icon) === IconType.Emoji;
  const pageTitle = hasEmojiInTitle
    ? document.titleWithDefault.replace(document.icon!, "")
    : document.titleWithDefault;
  const favicon = hasEmojiInTitle ? emojiToUrl(document.icon!) : undefined;

  const fullWidthTransformOffsetStyle = {
    ["--full-width-transform-offset"]: `${document.fullWidth && showContents ? tocOffset : 0}px`,
  } as React.CSSProperties;

  return (
    <ErrorBoundary showTitle>
      <RegisterKeyDown trigger="m" handler={onMove} />
      <RegisterKeyDown trigger="z" handler={onUndoRedo} />
      <RegisterKeyDown trigger="e" handler={goToEdit} />
      <RegisterKeyDown trigger="Escape" handler={goBack} />
      <RegisterKeyDown trigger="h" handler={goToHistory} />
      <RegisterKeyDown
        trigger="p"
        options={{
          allowInInput: true,
        }}
        handler={handlePublishShortcut}
      />
      <MeasuredContainer
        as={Background}
        name="container"
        key={revision ? revision.id : document.id}
        column
        auto
      >
        <PageTitle title={pageTitle} favicon={favicon} />
        {(isUploading || isSaving) && <LoadingIndicator />}
        <Container column>
          {!readOnly && (
            <Prompt
              when={isUploading && !isEditorDirty}
              message={t(
                `Images are still uploading.\nAre you sure you want to discard them?`
              )}
            />
          )}
          <Header
            editorRef={editorRef}
            document={document}
            revision={revision}
            isDraft={document.isDraft}
            isEditing={!readOnly && !!user?.separateEditMode}
            isSaving={isSaving}
            isPublishing={isPublishing}
            publishingIsDisabled={document.isSaving || isPublishing || isEmpty}
            savingIsDisabled={document.isSaving || isEmpty}
            onSelectTemplate={handleSelectTemplate}
            onSave={onSave}
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
                    ref={editorRef}
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
                      ref={editorRef}
                      multiplayer={multiplayerEditor}
                      isDraft={document.isDraft}
                      document={document}
                      value={readOnly ? document.data : undefined}
                      defaultValue={document.data}
                      embedsDisabled={embedsDisabled}
                      onSynced={onSynced}
                      onFileUploadStart={onFileUploadStart}
                      onFileUploadStop={onFileUploadStop}
                      onCreateLink={onCreateLink}
                      onChangeTitle={handleChangeTitle}
                      onChangeIcon={handleChangeIcon}
                      onSave={onSave}
                      onPublish={onPublish}
                      onCancel={goBack}
                      readOnly={readOnly}
                      canUpdate={abilities.update}
                      canComment={abilities.comment}
                      autoFocus={document.createdAt === document.updatedAt}
                    >
                      <ReferencesWrapper>
                        <References document={document} />
                      </ReferencesWrapper>
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
    max-width: ${({ fullWidth }: MainProps) =>
      fullWidth
        ? `100%`
        : `calc(${EditorStyleHelper.documentWidth} + ${EditorStyleHelper.documentGutter})`};
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

export default observer(DocumentScene);
