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
import type Note from "~/models/Note";
import type Revision from "~/models/Revision";
import NoteMove from "~/components/NoteExplorer/NoteMove";
import NotePublish from "~/scenes/NotePublish";
import ErrorBoundary from "~/components/ErrorBoundary";
import LoadingIndicator from "~/components/LoadingIndicator";
import PageTitle from "~/components/PageTitle";
import PlaceholderNote from "~/components/PlaceholderNote";
import RegisterKeyDown from "~/components/RegisterKeyDown";
import { MeasuredContainer } from "~/components/MeasuredContainer";
import type { Editor as TEditor } from "~/editor";
import type { Properties } from "~/types";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import useStores from "~/hooks/useStores";
import isTextInput from "~/utils/isTextInput";
import { client } from "~/utils/ApiClient";
import { emojiToUrl } from "~/utils/emoji";
import { noteHistoryPath, noteEditPath } from "~/utils/routeHelpers";
import { useNoteSave } from "../hooks/useNoteSave";
import Container from "./Container";
import Contents from "./Contents";
import Editor from "./Editor";
import Header from "./Header";
import Notices from "./Notices";
import References from "./References";
import RevisionViewer from "./RevisionViewer";
import SharedHeader from "./SharedHeader";
type LocationState = {
  title?: string;
  restore?: boolean;
  revisionId?: string;
};
interface Props {
  /** Tree of navigation nodes for shared notes. */
  sharedTree?: NavigationNode;
  /** Map of ability names to booleans representing current user permissions. */
  abilities: Record<string, boolean>;
  /** The note model being viewed or edited. */
  note: Note;
  /** An optional revision to display instead of the live note. */
  revision?: Revision;
  /** Whether the note is in read-only mode. */
  readOnly: boolean;
  /** The share ID when viewing a publicly shared note. */
  shareId?: string;
  /** Override for the table of contents position, or false to hide it. */
  tocPosition?: TOCPosition | false;
  /** Callback to create a linked note from the editor. */
  onCreateLink?: (
    params: Properties<Note>,
    nested?: boolean
  ) => Promise<string>;
  /** Optional children rendered after the main note content. */
  children?: React.ReactNode;
}
/** Scene component responsible for rendering and interacting with a note. */
function NoteScene({
  note,
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
  } = useNoteSave({ note, editorRef, readOnly });
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
    history.replace(note.url, {
      ...location.state,
      restore: undefined,
      revisionId: undefined,
    });
    if (!revisionId) {
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
    }
  }, [location, replaceSelection, t, history, note.url]);
  const onUndoRedo = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : undefined;
      // The editor handles undo/redo through its own keymap when focused
      if (
        editorRef.current?.view?.hasFocus() ||
        (target && (isTextInput(target) || !!target.closest(".ProseMirror")))
      ) {
        return;
      }
      event.preventDefault();
      if (readOnly) {
        return;
      }
      if (event.shiftKey) {
        editorRef.current?.commands.redo?.();
      } else {
        editorRef.current?.commands.undo?.();
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
          content: <NoteMove note={note} />,
        });
      }
    },
    [note, dialogs, t, abilities.move]
  );
  const goToEdit = useCallback(
    (ev: KeyboardEvent) => {
      if (readOnly) {
        ev.preventDefault();
        if (abilities.update) {
          history.push({
            pathname: noteEditPath(note),
            state: { sidebarContext },
          });
        }
      } else if (editorRef.current?.isBlurred) {
        ev.preventDefault();
        editorRef.current?.focus();
      }
    },
    [readOnly, abilities.update, history, note, sidebarContext]
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
          pathname: note.path,
          state: { sidebarContext },
        });
      } else {
        history.push({
          pathname: noteHistoryPath(note),
          state: { sidebarContext },
        });
      }
    },
    [readOnly, location.pathname, history, note, sidebarContext]
  );
  const onPublish = useCallback(
    (ev: React.MouseEvent | KeyboardEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (note.publishedAt) {
        return;
      }
      if (note?.notebookId) {
        void onSave({
          publish: true,
          done: true,
        });
      } else {
        dialogs.openModal({
          title: t("Publish document"),
          content: <NotePublish note={note} />,
        });
      }
    },
    [note, dialogs, t, onSave]
  );
  const goBack = useCallback(() => {
    if (!readOnly) {
      history.push({
        pathname: note.url,
        state: { sidebarContext },
      });
    }
  }, [readOnly, history, note, sidebarContext]);
  // Render
  const isShare = !!shareId;
  const embedsDisabled =
    (team && team.noteEmbeds === false) || note.embedsDisabled;
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
    !note.isArchived && !note.isDeleted && !revision && !isShare;
  const hasEmojiInTitle = determineIconType(note.icon) === IconType.Emoji;
  const pageTitle = hasEmojiInTitle
    ? note.titleWithDefault.replace(note.icon!, "")
    : note.titleWithDefault;
  const favicon = hasEmojiInTitle ? emojiToUrl(note.icon!) : undefined;
  const fullWidthTransformOffsetStyle = {
    ["--full-width-transform-offset"]: `${note.fullWidth && showContents ? tocOffset : 0}px`,
  } as React.CSSProperties;
  return (
    <ErrorBoundary showTitle>
      <RegisterKeyDown trigger="m" handler={onMove} />
      <RegisterKeyDown trigger="z" metaKey handler={onUndoRedo} />
      <RegisterKeyDown trigger="e" handler={goToEdit} />
      <RegisterKeyDown trigger="Escape" handler={goBack} />
      <RegisterKeyDown trigger="h" handler={goToHistory} />
      <RegisterKeyDown
        trigger="p"
        metaKey
        shiftKey
        options={{
          allowInInput: true,
        }}
        handler={onPublish}
      />
      <MeasuredContainer
        as={Background}
        name="container"
        key={revision ? revision.id : note.id}
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
          {isShare ? (
            <SharedHeader note={note} />
          ) : (
            <Header
              editorRef={editorRef}
              note={note}
              revision={revision}
              isDraft={note.isDraft}
              isEditing={!readOnly && !!user?.separateEditMode}
              isSaving={isSaving}
              isPublishing={isPublishing}
              publishingIsDisabled={note.isSaving || isPublishing || isEmpty}
              savingIsDisabled={note.isSaving || isEmpty}
              onSelectTemplate={handleSelectTemplate}
              onSave={onSave}
            />
          )}
          <Main
            fullWidth={note.fullWidth}
            tocPosition={tocPos}
            style={fullWidthTransformOffsetStyle}
          >
            <React.Suspense
              fallback={
                <EditorContainer
                  docFullWidth={note.fullWidth}
                  showContents={showContents}
                  tocPosition={tocPos}
                >
                  <PlaceholderNote />
                </EditorContainer>
              }
            >
              <MeasuredContainer
                name="note"
                as={EditorContainer}
                docFullWidth={note.fullWidth}
                showContents={showContents}
                tocPosition={tocPos}
              >
                {revision ? (
                  <RevisionViewer
                    ref={editorRef}
                    note={note}
                    revision={revision}
                    id={revision.id}
                  />
                ) : (
                  <>
                    <Notices note={note} readOnly={readOnly} />

                    {showContents && (
                      <PrintContentsContainer>
                        <Contents />
                      </PrintContentsContainer>
                    )}
                    <Editor
                      id={note.id}
                      key={embedsDisabled ? "disabled" : "enabled"}
                      ref={editorRef}
                      multiplayer={multiplayerEditor}
                      isDraft={note.isDraft}
                      note={note}
                      value={readOnly ? note.data : undefined}
                      defaultValue={note.data}
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
                      autoFocus={note.createdAt === note.updatedAt}
                    >
                      <ReferencesWrapper>
                        <References note={note} />
                      </ReferencesWrapper>
                    </Editor>
                  </>
                )}
              </MeasuredContainer>
              {showContents && (
                <ContentsContainer
                  docFullWidth={note.fullWidth}
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
        : `1fr minmax(0, ${`calc(46em + ${EditorStyleHelper.noteGutter})`}) 1fr`};
  `};

  ${breakpoint("desktopLarge")`
    grid-template-columns: ${({ fullWidth, tocPosition }: MainProps) =>
      fullWidth
        ? tocPosition === TOCPosition.Left
          ? `${EditorStyleHelper.tocWidth}px minmax(0, 1fr)`
          : `minmax(0, 1fr) ${EditorStyleHelper.tocWidth}px`
        : `1fr minmax(0, ${`calc(${EditorStyleHelper.noteWidth} + ${EditorStyleHelper.noteGutter})`}) 1fr`};
  `};

  @media print {
    display: block;
    max-width: ${({ fullWidth }: MainProps) =>
      fullWidth
        ? `100%`
        : `calc(${EditorStyleHelper.noteWidth} + ${EditorStyleHelper.noteGutter})`};
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
    grid-column: ${({ docFullWidth, position }: ContentsContainerProps) => (position === TOCPosition.Left ? 1 : docFullWidth ? 2 : 3)};
    justify-self: ${({ position }: ContentsContainerProps) => (position === TOCPosition.Left ? "end" : "start")};
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
  padding: 0 32px;

  ${breakpoint("tablet")`
    padding: 0 44px;
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
export default observer(NoteScene);
