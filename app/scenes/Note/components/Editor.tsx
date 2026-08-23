import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { mergeRefs } from "react-merge-refs";
import { useRouteMatch } from "react-router-dom";
import styled from "styled-components";
import Text from "@shared/components/Text";
import type { CommentAnchor } from "@shared/editor/commands/comment";
import { richExtensions, withComments } from "@shared/editor/nodes";
import { colorPalette } from "@shared/constants";
import Comment from "~/models/Comment";
import type Note from "~/models/Note";
import type Template from "~/models/Template";
import type { RefHandle } from "~/components/ContentEditable";
import { useNoteContext } from "~/components/NoteContext";
import type { Props as EditorProps } from "~/components/Editor";
import Editor from "~/components/Editor";
import { useSplitView } from "~/components/SplitView/context";
import type { Editor as SharedEditor } from "~/editor";
import Flex from "~/components/Flex";
import Time from "~/components/Time";
import { withUIExtensions } from "~/editor/extensions";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import { useFocusedComment } from "~/hooks/useFocusedComment";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import usePolicy from "~/hooks/usePolicy";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import {
  noteHistoryPath,
  notePath,
  matchNoteHistory,
} from "~/utils/routeHelpers";
import { decodeURIComponentSafe } from "~/utils/urls";
import MultiplayerEditor from "./AsyncMultiplayerEditor";
import NoteMeta from "./NoteMeta";
import NoteTitle from "./NoteTitle";
import { first } from "es-toolkit/compat";
import { getLangFor } from "~/utils/language";
import useShare from "@shared/hooks/useShare";
import CodeWordBreak from "@shared/editor/extensions/CodeWordBreak";
const extensions = [
  CodeWordBreak,
  ...withUIExtensions(withComments(richExtensions)),
];
type Props = Omit<EditorProps, "editorStyle"> & {
  onChangeTitle: (title: string) => void;
  onChangeIcon: (icon: string | null, color: string | null) => void;
  id: string;
  note: Note | Template;
  isDraft: boolean;
  multiplayer?: boolean;
  onSave: (options: {
    done?: boolean;
    autosave?: boolean;
    publish?: boolean;
  }) => void;
  children?: React.ReactNode;
};
/**
 * The main note editor includes an editable title with metadata below it,
 * and support for commenting.
 */
function NoteEditor(props: Props, ref: React.ForwardedRef<SharedEditor>) {
  const editorRef = React.useRef<SharedEditor>(null);
  const titleRef = React.useRef<RefHandle>(null);
  const { t } = useTranslation();
  const match = useRouteMatch();
  const { setFocusedCommentId } = useNoteContext();
  const focusedComment = useFocusedComment();
  const { ui, comments } = useStores();
  const { pane } = useSplitView();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const team = useCurrentTeam({ rejectOnEmpty: false });
  const sidebarContext = useLocationSidebarContext();
  const params = useQuery();
  const { shareId, showLastUpdated } = useShare();
  const {
    note,
    onChangeTitle,
    onChangeIcon,
    isDraft,
    readOnly,
    children,
    multiplayer,
    ...rest
  } = props;
  const can = usePolicy(note);
  const commentingEnabled = !!team?.commentingEnabled;
  const iconColor = note.color ?? (first(colorPalette) as string);
  const childRef = React.useRef<HTMLDivElement>(null);
  const focusAtStart = React.useCallback(() => {
    if (editorRef.current) {
      editorRef.current.focusAtStart();
    }
  }, []);
  React.useEffect(() => {
    if (focusedComment && focusedComment.noteId === note.id) {
      const viewingResolved = params.get("resolved") === "";
      if (
        (focusedComment.isResolved && !viewingResolved) ||
        (!focusedComment.isResolved && viewingResolved)
      ) {
        setFocusedCommentId(focusedComment.id);
      }
      ui.setRightSidebar("comments", pane);
    }
  }, [focusedComment, ui, pane, note.id, params, setFocusedCommentId]);
  // Save note when blurring title, but delay so that if clicking on a
  // button this is allowed to execute first.
  const handleBlur = React.useCallback(() => {
    setTimeout(() => props.onSave({ autosave: true }), 250);
  }, [props]);
  const handleGoToNextInput = React.useCallback(
    (insertParagraph: boolean) => {
      if (insertParagraph && editorRef.current) {
        const { view } = editorRef.current;
        const { dispatch, state } = view;
        dispatch(state.tr.insert(0, state.schema.nodes.paragraph.create()));
      }
      focusAtStart();
    },
    [focusAtStart]
  );
  // Create a Comment model in local store when a comment mark is created, this
  // acts as a local draft before submission.
  const handleDraftComment = React.useCallback(
    (
      commentId: string,
      createdById: string,
      options?: {
        focus: boolean;
        anchor?: CommentAnchor;
      }
    ) => {
      if (comments.get(commentId) || createdById !== user?.id) {
        return;
      }
      const comment = new Comment(
        {
          noteId: props.id,
          createdAt: new Date(),
          createdById,
          reactions: [],
        },
        comments
      );
      comment.id = commentId;
      comment.pendingAnchor = options?.anchor;
      comments.add(comment);
      if (options?.focus) {
        setFocusedCommentId(commentId);
      }
    },
    [comments, user?.id, props.id, setFocusedCommentId]
  );
  // Focus a comment and open the sidebar when its mark or gutter marker is
  // clicked.
  const handleClickCommentMark = React.useCallback(
    (commentId: string) => {
      setFocusedCommentId(commentId);
      ui.setRightSidebar("comments", pane);
    },
    [setFocusedCommentId, ui, pane]
  );
  // Soft delete the Comment model when associated mark is totally removed.
  const handleRemoveComment = React.useCallback(
    async (commentId: string) => {
      const comment = comments.get(commentId);
      if (comment?.isNew) {
        await comment?.delete();
      }
    },
    [comments]
  );
  const {
    setEditor,
    setEditorInitialized,
    updateState: updateDocState,
  } = useNoteContext();
  const handleRefChanged = React.useCallback(setEditor, [setEditor]);
  const EditorComponent = multiplayer ? MultiplayerEditor : Editor;
  const childOffsetHeight = childRef.current?.offsetHeight || 0;
  const editorStyle = React.useMemo(
    () => ({
      padding: "0 32px",
      margin: "0 -32px",
      paddingBottom: `calc(30vh - ${childOffsetHeight}px)`,
    }),
    [childOffsetHeight]
  );
  const handleInit = React.useCallback(
    () => setEditorInitialized(true),
    [setEditorInitialized]
  );
  const handleDestroy = React.useCallback(
    () => setEditorInitialized(false),
    [setEditorInitialized]
  );
  const direction = titleRef.current?.getComputedDirection();
  return (
    <Flex auto column>
      <NoteTitle
        ref={titleRef}
        readOnly={readOnly}
        noteId={note.id}
        title={!note.title && readOnly ? note.titleWithDefault : note.title}
        icon={note.icon}
        color={iconColor}
        onChangeTitle={onChangeTitle}
        onChangeIcon={onChangeIcon}
        onGoToNextInput={handleGoToNextInput}
        onBlur={handleBlur}
        placeholder={t("Untitled")}
      />
      {shareId ? (
        showLastUpdated && note.updatedAt ? (
          <SharedMeta type="tertiary">
            {t("Last updated")} <Time dateTime={note.updatedAt} addSuffix />
          </SharedMeta>
        ) : null
      ) : !rest.template ? (
        <NoteMeta
          note={note as Note}
          to={{
            pathname:
              match.path === matchNoteHistory
                ? notePath(note as Note)
                : noteHistoryPath(note as Note),
            state: { sidebarContext },
          }}
          rtl={direction === "rtl"}
        />
      ) : null}
      <EditorComponent
        ref={mergeRefs([ref, editorRef, handleRefChanged])}
        lang={getLangFor(note.language)}
        autoFocus={!!note.title && !props.defaultValue}
        placeholder={t("Type '/' to insert, or start writing…")}
        scrollTo={decodeURIComponentSafe(window.location.hash)}
        readOnly={readOnly}
        userId={user?.id}
        focusedCommentId={focusedComment?.id}
        onClickCommentMark={
          commentingEnabled && can.comment ? handleClickCommentMark : undefined
        }
        onCreateCommentMark={
          commentingEnabled && can.comment ? handleDraftComment : undefined
        }
        onDeleteCommentMark={
          commentingEnabled && can.comment ? handleRemoveComment : undefined
        }
        onOpenCommentsSidebar={
          commentingEnabled
            ? () => ui.setRightSidebar("comments", pane)
            : undefined
        }
        onInit={handleInit}
        onDestroy={handleDestroy}
        onChange={updateDocState}
        extensions={extensions}
        editorStyle={editorStyle}
        {...rest}
        canComment={commentingEnabled && can.comment}
      />
      <div ref={childRef}>{children}</div>
    </Flex>
  );
}
const SharedMeta = styled(Text)`
  margin: -12px 0 2em 0;
  font-size: 14px;
`;
export default observer(React.forwardRef(NoteEditor));
