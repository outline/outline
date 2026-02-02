import { observer } from "mobx-react";
import { darken } from "polished";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { mergeRefs } from "react-merge-refs";
import { useRouteMatch } from "react-router-dom";
import { toast } from "sonner";
import styled from "styled-components";
import { faMicrophone, faStop } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Text from "@shared/components/Text";
import { richExtensions, withComments } from "@shared/editor/nodes";
import { TeamPreference } from "@shared/types";
import { colorPalette } from "@shared/utils/collections";
import Comment from "~/models/Comment";
import type Document from "~/models/Document";
import type { RefHandle } from "~/components/ContentEditable";
import { useDocumentContext } from "~/components/DocumentContext";
import type { Props as EditorProps } from "~/components/Editor";
import Editor from "~/components/Editor";
import Flex from "~/components/Flex";
import Time from "~/components/Time";
import Tooltip from "~/components/Tooltip";
import { withUIExtensions } from "~/editor/extensions";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import { useFocusedComment } from "~/hooks/useFocusedComment";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import usePolicy from "~/hooks/usePolicy";
import useQuery from "~/hooks/useQuery";
import useSpeechToText from "~/hooks/useSpeechToText";
import useStores from "~/hooks/useStores";
import { client } from "~/utils/ApiClient";
import {
  documentHistoryPath,
  documentPath,
  matchDocumentHistory,
} from "~/utils/routeHelpers";
import { decodeURIComponentSafe } from "~/utils/urls";
import MultiplayerEditor from "./AsyncMultiplayerEditor";
import DocumentMeta from "./DocumentMeta";
import DocumentTitle from "./DocumentTitle";
import first from "lodash/first";
import { getLangFor } from "~/utils/language";
import useShare from "@shared/hooks/useShare";

const extensions = withUIExtensions(withComments(richExtensions));

type Props = Omit<EditorProps, "editorStyle"> & {
  onChangeTitle: (title: string) => void;
  onChangeIcon: (icon: string | null, color: string | null) => void;
  id: string;
  document: Document;
  isDraft: boolean;
  multiplayer?: boolean;
  onSave: (options: {
    done?: boolean;
    autosave?: boolean;
    publish?: boolean;
  }) => void;
  children: React.ReactNode;
};

/**
 * The main document editor includes an editable title with metadata below it,
 * and support for commenting.
 */
function DocumentEditor(props: Props, ref: React.RefObject<any>) {
  const titleRef = React.useRef<RefHandle>(null);
  const { t } = useTranslation();
  const match = useRouteMatch();
  const { setFocusedCommentId } = useDocumentContext();
  const focusedComment = useFocusedComment();
  const { ui, comments } = useStores();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const team = useCurrentTeam({ rejectOnEmpty: false });
  const sidebarContext = useLocationSidebarContext();
  const params = useQuery();
  const { shareId } = useShare();
  const { isListening, transcript, start, stop, error: dictationError } = useSpeechToText();

  React.useEffect(() => {
    if (transcript && ref.current) {
      const { view } = ref.current;
      view.dispatch(view.state.tr.insertText(transcript));
    }
  }, [transcript, ref]);

  React.useEffect(() => {
    if (dictationError) {
      toast.error(dictationError);
    }
  }, [dictationError]);
  const {
    document,
    onChangeTitle,
    onChangeIcon,
    isDraft,
    readOnly,
    children,
    multiplayer,
    ...rest
  } = props;
  const can = usePolicy(document);
  const commentingEnabled = !!team?.getPreference(TeamPreference.Commenting);

  const iconColor = document.color ?? (first(colorPalette) as string);
  const childRef = React.useRef<HTMLDivElement>(null);
  const focusAtStart = React.useCallback(() => {
    if (ref.current) {
      ref.current.focusAtStart();
    }
  }, [ref]);

  React.useEffect(() => {
    if (focusedComment) {
      const viewingResolved = params.get("resolved") === "";
      if (
        (focusedComment.isResolved && !viewingResolved) ||
        (!focusedComment.isResolved && viewingResolved)
      ) {
        setFocusedCommentId(focusedComment.id);
      }
      ui.set({ commentsExpanded: true });
    }
  }, [focusedComment, ui, document.id, params]);

  // Save document when blurring title, but delay so that if clicking on a
  // button this is allowed to execute first.
  const handleBlur = React.useCallback(() => {
    setTimeout(() => props.onSave({ autosave: true }), 250);
  }, [props]);

  const handleGoToNextInput = React.useCallback(
    (insertParagraph: boolean) => {
      if (insertParagraph && ref.current) {
        const { view } = ref.current;
        const { dispatch, state } = view;
        dispatch(state.tr.insert(0, state.schema.nodes.paragraph.create()));
      }

      focusAtStart();
    },
    [focusAtStart, ref]
  );

  // Create a Comment model in local store when a comment mark is created, this
  // acts as a local draft before submission.
  const handleDraftComment = React.useCallback(
    (commentId: string, createdById: string) => {
      if (comments.get(commentId) || createdById !== user?.id) {
        return;
      }

      const comment = new Comment(
        {
          documentId: props.id,
          createdAt: new Date(),
          createdById,
          reactions: [],
        },
        comments
      );
      comment.id = commentId;
      comments.add(comment);
      setFocusedCommentId(commentId);
    },
    [comments, user?.id, props.id]
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

  const handleTranscribeAudio = React.useCallback(
    async (attachmentId: string) => {
      const toastId = toast.loading(t("Transcribing audio…"));
      try {
        const response = await client.post("/audio.transcribe", {
          attachmentId,
        });
        toast.success(t("Transcription complete"), { id: toastId });
        return response.data.text;
      } catch (err) {
        toast.error(t("Transcription failed: {{error}}", { error: err.message }), {
          id: toastId,
        });
        throw err;
      }
    },
    [t]
  );

  const {
    setEditor,
    setEditorInitialized,
    updateState: updateDocState,
  } = useDocumentContext();
  const handleRefChanged = React.useCallback(setEditor, [setEditor]);
  const EditorComponent = multiplayer ? MultiplayerEditor : Editor;

  const childOffsetHeight = childRef.current?.offsetHeight || 0;
  const editorStyle = React.useMemo(
    () => ({
      padding: "0 32px",
      margin: "0 -32px",
      paddingBottom: `calc(50vh - ${childOffsetHeight}px)`,
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
      <DocumentTitle
        ref={titleRef}
        readOnly={readOnly}
        documentId={document.id}
        title={
          !document.title && readOnly
            ? document.titleWithDefault
            : document.title
        }
        icon={document.icon}
        color={iconColor}
        onChangeTitle={onChangeTitle}
        onChangeIcon={onChangeIcon}
        onGoToNextInput={handleGoToNextInput}
        onBlur={handleBlur}
        placeholder={t("Untitled")}
      />
      {shareId ? (
        document.updatedAt ? (
          <SharedMeta type="tertiary">
            {t("Last updated")} <Time dateTime={document.updatedAt} addSuffix />
          </SharedMeta>
        ) : null
      ) : (
        <DocumentMeta
          document={document}
          to={
            shareId
              ? undefined
              : {
                pathname:
                  match.path === matchDocumentHistory
                    ? documentPath(document)
                    : documentHistoryPath(document),
                state: { sidebarContext },
              }
          }
          $rtl={direction === "rtl"}
        />
      )}
      <EditorComponent
        ref={mergeRefs([ref, handleRefChanged])}
        lang={getLangFor(document.language)}
        autoFocus={!!document.title && !props.defaultValue}
        placeholder={t("Type '/' to insert, or start writing…")}
        scrollTo={decodeURIComponentSafe(window.location.hash)}
        readOnly={readOnly}
        userId={user?.id}
        focusedCommentId={focusedComment?.id}
        onClickCommentMark={
          commentingEnabled && can.comment ? setFocusedCommentId : undefined
        }
        onCreateCommentMark={
          commentingEnabled && can.comment ? handleDraftComment : undefined
        }
        onDeleteCommentMark={
          commentingEnabled && can.comment ? handleRemoveComment : undefined
        }
        onTranscribeAudio={handleTranscribeAudio}
        onInit={handleInit}
        onDestroy={handleDestroy}
        onChange={updateDocState}
        extensions={extensions}
        editorStyle={editorStyle}
        {...rest}
      />
      <div ref={childRef}>{children}</div>
      {!readOnly && (
        <FloatingActions>
          <Tooltip content={isListening ? t("Stop dictation") : t("Dictate")} placement="left">
            <DictateButton onClick={isListening ? stop : start} $isListening={isListening}>
              <FontAwesomeIcon icon={isListening ? faStop : faMicrophone} />
            </DictateButton>
          </Tooltip>
        </FloatingActions>
      )}
    </Flex>
  );
}

const SharedMeta = styled(Text)`
  margin: -12px 0 2em 0;
  font-size: 14px;
`;

const FloatingActions = styled.div`
  position: fixed;
  bottom: 32px;
  right: 32px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 100;
`;

const DictateButton = styled.button<{ $isListening: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 24px;
  border: none;
  background: ${(props) => (props.$isListening ? props.theme.danger : props.theme.accent)};
  color: ${(props) => props.theme.white};
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: all 100ms ease-in-out;

  &:hover {
    transform: scale(1.05);
    background: ${(props) =>
    props.$isListening ? darken(0.05, props.theme.danger) : darken(0.05, props.theme.accent)};
  }

  &:active {
    transform: scale(0.95);
  }
`;

export default observer(React.forwardRef(DocumentEditor));
