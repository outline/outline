import { observer } from "mobx-react";
import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import type { ProsemirrorData, ProsemirrorMark } from "@shared/types";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import Scrollable from "~/components/Scrollable";
import { useDocumentContext } from "~/components/DocumentContext";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePersistedState from "~/hooks/usePersistedState";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import type Document from "~/models/Document";
import CommentForm from "./CommentForm";
import CommentThread from "./CommentThread";

type Props = {
  /** The document the image belongs to. */
  document: Document;
  /** The position of the image node in the document. */
  pos: number;
};

function LightboxComments({ document, pos }: Props) {
  const { comments } = useStores();
  const { editor, focusedCommentId, setFocusedCommentId } =
    useDocumentContext();
  const user = useCurrentUser();
  const { t } = useTranslation();
  const can = usePolicy(document);

  const [draft, onSaveDraft] = usePersistedState<ProsemirrorData | undefined>(
    `draft-${document.id}-image-${pos}`,
    undefined
  );

  const commentIds = editor?.view?.state?.doc
    ? ProsemirrorHelper.getCommentIdsAtPos(editor.view.state.doc, pos)
    : [];

  const threads = comments
    .threadsInDocument(document.id)
    .filter(
      (comment) => commentIds.includes(comment.id) && !comment.isResolved
    );

  const draftCommentIdRef = useRef<string | null>(null);

  // When submitting a new comment from the bottom form, anchor it to the image
  // by adding a draft comment mark to the image node's `attrs.marks`. The mark
  // is flipped to `draft: false` in `handleSubmit` once the comment has been
  // persisted on the server.
  const handleBeforeCreate = useCallback(
    (commentId: string) => {
      if (!editor) {
        return;
      }
      const { state, dispatch } = editor.view;
      const node = state.doc.nodeAt(pos);
      if (!node) {
        return;
      }

      const existingMarks = (node.attrs.marks ?? []) as ProsemirrorMark[];
      const newMark: ProsemirrorMark = {
        type: "comment",
        attrs: {
          id: commentId,
          userId: user.id,
          draft: true,
        },
      };
      const newAttrs = {
        ...node.attrs,
        marks: [...existingMarks, newMark],
      };
      dispatch(state.tr.setNodeMarkup(pos, undefined, newAttrs));
      draftCommentIdRef.current = commentId;
    },
    [editor, pos, user.id]
  );

  const handleSubmit = useCallback(() => {
    setFocusedCommentId(null);
    const commentId = draftCommentIdRef.current;
    if (commentId) {
      editor?.updateComment(commentId, { draft: false });
      draftCommentIdRef.current = null;
    }
  }, [editor, setFocusedCommentId]);

  const focusedComment =
    focusedCommentId && commentIds.includes(focusedCommentId)
      ? comments.get(focusedCommentId)
      : undefined;

  const hasComments = threads.length > 0;
  const canComment = can.comment;

  return (
    <Wrapper column>
      <Header>{t("Comments")}</Header>
      <Body bottomShadow={!focusedComment} hiddenScrollbars topShadow>
        <List $hasComments={hasComments}>
          {hasComments ? (
            threads.map((thread) => (
              <CommentThread
                key={thread.id}
                comment={thread}
                document={document}
                recessed={!!focusedComment && focusedComment.id !== thread.id}
                focused={focusedComment?.id === thread.id}
              />
            ))
          ) : (
            <NoComments align="center" justify="center" auto>
              <Empty>{t("No comments yet")}</Empty>
            </NoComments>
          )}
        </List>
      </Body>
      {canComment && !focusedComment && (
        <NewCommentForm
          draft={draft}
          onSaveDraft={onSaveDraft}
          documentId={document.id}
          placeholder={`${t("Add a comment")}…`}
          autoFocus={false}
          standalone
          onBeforeCreate={handleBeforeCreate}
          onSubmit={handleSubmit}
        />
      )}
    </Wrapper>
  );
}

const Wrapper = styled(Flex)`
  width: 360px;
  max-width: 100%;
  height: 100%;
  background: ${s("background")};
  border-inline-start: 1px solid ${s("divider")};
`;

const Header = styled.div`
  flex-shrink: 0;
  padding: 20px 16px 16px;
  font-size: 16px;
  font-weight: 600;
  color: ${s("text")};
  user-select: none;
`;

const Body = styled(Scrollable)`
  flex: 1 1 auto;
  min-height: 0;
`;

const List = styled.div<{ $hasComments: boolean }>`
  height: ${(props) => (props.$hasComments ? "auto" : "100%")};
  padding-bottom: 12px;
`;

const NoComments = styled(Flex)`
  height: 100%;
  padding: 24px;
`;

const NewCommentForm = styled(CommentForm)`
  flex-shrink: 0;
  padding: 12px;
  padding-inline-end: 18px;
  padding-inline-start: 12px;
  border-top: 1px solid ${s("divider")};
`;

export default observer(LightboxComments);
