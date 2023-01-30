import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { mergeRefs } from "react-merge-refs";
import { useHistory, useRouteMatch } from "react-router-dom";
import fullWithCommentsPackage from "@shared/editor/packages/fullWithComments";
import { TeamPreference } from "@shared/types";
import Comment from "~/models/Comment";
import Document from "~/models/Document";
import { RefHandle } from "~/components/ContentEditable";
import Editor, { Props as EditorProps } from "~/components/Editor";
import Flex from "~/components/Flex";
import useStores from "~/hooks/useStores";
import {
  documentHistoryUrl,
  documentUrl,
  matchDocumentHistory,
} from "~/utils/routeHelpers";
import { useDocumentContext } from "../../../components/DocumentContext";
import MultiplayerEditor from "./AsyncMultiplayerEditor";
import DocumentMeta from "./DocumentMeta";
import EditableTitle from "./EditableTitle";

type Props = Omit<EditorProps, "extensions"> & {
  onChangeTitle: (text: string) => void;
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
  const { ui, comments, auth } = useStores();
  const { user, team } = auth;
  const history = useHistory();
  const {
    document,
    onChangeTitle,
    isDraft,
    shareId,
    readOnly,
    children,
    multiplayer,
    ...rest
  } = props;

  const childRef = React.useRef<HTMLDivElement>(null);
  const focusAtStart = React.useCallback(() => {
    if (ref.current) {
      ref.current.focusAtStart();
    }
  }, [ref]);

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

  const handleClickComment = React.useCallback(
    (commentId?: string) => {
      if (commentId) {
        ui.expandComments();
        history.replace({
          pathname: window.location.pathname.replace(/\/history$/, ""),
          state: { commentId },
        });
      } else {
        history.replace({
          pathname: window.location.pathname,
        });
      }
    },
    [ui, history]
  );

  // Create a Comment model in local store when a comment mark is created, this
  // acts as a local draft before submission.
  const handleDraftComment = React.useCallback(
    (commentId: string) => {
      if (comments.get(commentId)) {
        return;
      }

      ui.expandComments();

      const comment = new Comment(
        {
          documentId: props.id,
        },
        comments
      );
      comment.id = commentId;
      comments.add(comment);
    },
    [comments, props.id, ui]
  );

  // Soft delete the Comment model when associated mark is totally removed.
  const handleRemoveComment = React.useCallback(
    async (commentId: string) => {
      const comment = comments.get(commentId);
      await comment?.delete();
    },
    [comments]
  );

  const { setEditor } = useDocumentContext();
  const handleRefChanged = React.useCallback(setEditor, [setEditor]);
  const EditorComponent = multiplayer ? MultiplayerEditor : Editor;

  return (
    <Flex auto column>
      <EditableTitle
        ref={titleRef}
        readOnly={readOnly}
        document={document}
        onGoToNextInput={handleGoToNextInput}
        onChange={onChangeTitle}
        onBlur={handleBlur}
        starrable={!shareId}
        placeholder={t("Untitled")}
      />
      {!shareId && (
        <DocumentMeta
          isDraft={isDraft}
          document={document}
          to={
            match.path === matchDocumentHistory
              ? documentUrl(document)
              : documentHistoryUrl(document)
          }
          rtl={
            titleRef.current?.getComputedDirection() === "rtl" ? true : false
          }
        />
      )}
      <EditorComponent
        ref={mergeRefs([ref, handleRefChanged])}
        autoFocus={!!document.title && !props.defaultValue}
        placeholder={t("Type '/' to insert, or start writing…")}
        scrollTo={decodeURIComponent(window.location.hash)}
        readOnly={readOnly}
        shareId={shareId}
        userId={user?.id}
        onClickCommentMark={handleClickComment}
        onCreateCommentMark={
          team?.getPreference(TeamPreference.Commenting)
            ? handleDraftComment
            : undefined
        }
        onDeleteCommentMark={
          team?.getPreference(TeamPreference.Commenting)
            ? handleRemoveComment
            : undefined
        }
        extensions={fullWithCommentsPackage}
        bottomPadding={`calc(50vh - ${childRef.current?.offsetHeight || 0}px)`}
        {...rest}
      />
      <div ref={childRef}>{children}</div>
    </Flex>
  );
}

export default observer(React.forwardRef(DocumentEditor));
