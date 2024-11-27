import { observer } from "mobx-react";
import { darken } from "polished";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import scrollIntoView from "scroll-into-view-if-needed";
import styled, { css } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s } from "@shared/styles";
import { ProsemirrorData } from "@shared/types";
import Comment from "~/models/Comment";
import Document from "~/models/Document";
import { Avatar, AvatarSize } from "~/components/Avatar";
import { useDocumentContext } from "~/components/DocumentContext";
import Facepile from "~/components/Facepile";
import Fade from "~/components/Fade";
import { ResizingHeightContainer } from "~/components/ResizingHeightContainer";
import useOnClickOutside from "~/hooks/useOnClickOutside";
import usePersistedState from "~/hooks/usePersistedState";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { hover } from "~/styles";
import { sidebarAppearDuration } from "~/styles/animations";
import CommentForm from "./CommentForm";
import CommentThreadItem from "./CommentThreadItem";

type Props = {
  /** The document that this comment thread belongs to */
  document: Document;
  /** The root comment to render */
  comment: Comment;
  /** Whether the thread is focused */
  focused: boolean;
  /** Whether the thread is displayed in a recessed/backgrounded state */
  recessed: boolean;
  /** Enable scroll for the comments container */
  enableScroll: () => void;
  /** Disable scroll for the comments container */
  disableScroll: () => void;
  /** Number of replies before collapsing */
  collapseThreshold?: number;
  /** Number of replies to display when collapsed */
  collapseNumDisplayed?: number;
};

function CommentThread({
  comment: thread,
  document,
  recessed,
  focused,
  enableScroll,
  disableScroll,
  collapseThreshold = 5,
  collapseNumDisplayed = 3,
}: Props) {
  const [focusedOnMount] = React.useState(focused);
  const { editor } = useDocumentContext();
  const { comments } = useStores();
  const topRef = React.useRef<HTMLDivElement>(null);
  const replyRef = React.useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  const [autoFocus, setAutoFocus] = React.useState(thread.isNew);

  const can = usePolicy(document);

  const [draft, onSaveDraft] = usePersistedState<ProsemirrorData | undefined>(
    `draft-${document.id}-${thread.id}`,
    undefined
  );

  const canReply = can.comment && !thread.isResolved;

  const highlightedCommentMarks = editor
    ?.getComments()
    .filter((comment) => comment.id === thread.id);
  const highlightedText = highlightedCommentMarks?.map((c) => c.text).join("");

  const commentsInThread = comments
    .inThread(thread.id)
    .filter((comment) => !comment.isNew);

  const [collapse, setCollapse] = React.useState(() => {
    const numReplies = commentsInThread.length - 1;
    if (numReplies >= collapseThreshold) {
      return {
        begin: 1,
        final: commentsInThread.length - collapseNumDisplayed - 1,
      };
    }
    return null;
  });

  useOnClickOutside(topRef, (event) => {
    if (
      focused &&
      !(event.target as HTMLElement).classList.contains("comment") &&
      event.defaultPrevented === false
    ) {
      history.replace({
        search: location.search,
        pathname: location.pathname,
        state: { commentId: undefined },
      });
    }
  });

  const handleSubmit = React.useCallback(() => {
    editor?.updateComment(thread.id, { draft: false });
  }, [editor, thread.id]);

  const handleClickThread = () => {
    history.replace({
      // Clear any commentId from the URL when explicitly focusing a thread
      search: thread.isResolved ? "resolved=" : "",
      pathname: location.pathname.replace(/\/history$/, ""),
      state: { commentId: thread.id },
    });
  };

  const handleClickExpand = (ev: React.SyntheticEvent) => {
    ev.stopPropagation();
    setCollapse(null);
  };

  const renderShowMore = (collapse: { begin: number; final: number }) => {
    const count = collapse.final - collapse.begin + 1;
    const createdBy = commentsInThread
      .slice(collapse.begin, collapse.final + 1)
      .map((c) => c.createdBy);
    const users = Array.from(new Set(createdBy));
    const limit = 3;
    const overflow = users.length - limit;

    return (
      <ShowMore onClick={handleClickExpand} key="show-more">
        {t("Show {{ count }} reply", { count })}
        <Facepile
          users={users}
          limit={limit}
          overflow={overflow}
          size={AvatarSize.Medium}
          renderAvatar={(item) => (
            <Avatar size={AvatarSize.Medium} model={item} />
          )}
        />
      </ShowMore>
    );
  };

  React.useEffect(() => {
    if (!focused && autoFocus) {
      setAutoFocus(false);
    }
  }, [focused, autoFocus]);

  React.useEffect(() => {
    if (focused) {
      if (focusedOnMount) {
        setTimeout(() => {
          if (!topRef.current) {
            return;
          }
          scrollIntoView(topRef.current, {
            scrollMode: "if-needed",
            behavior: "auto",
            block: "nearest",
            boundary: (parent) =>
              // Prevents body and other parent elements from being scrolled
              parent.id !== "comments",
          });
        }, sidebarAppearDuration);
      } else {
        setTimeout(() => {
          if (!replyRef.current) {
            return;
          }
          scrollIntoView(replyRef.current, {
            scrollMode: "if-needed",
            behavior: "smooth",
            block: "center",
            boundary: (parent) =>
              // Prevents body and other parent elements from being scrolled
              parent.id !== "comments",
          });
        }, 0);
      }

      const getCommentMarkElement = () =>
        window.document?.getElementById(`comment-${thread.id}`);
      const isMarkVisible = !!getCommentMarkElement();

      setTimeout(
        () => {
          getCommentMarkElement()?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        },
        isMarkVisible ? 0 : sidebarAppearDuration
      );
    }
  }, [focused, focusedOnMount, thread.id]);

  return (
    <Thread
      ref={topRef}
      $focused={focused}
      $recessed={recessed}
      $dir={document.dir}
      onClick={handleClickThread}
    >
      {commentsInThread.map((comment, index) => {
        if (collapse !== null) {
          if (index === collapse.begin) {
            return renderShowMore(collapse);
          } else if (index > collapse.begin && index <= collapse.final) {
            return null;
          }
        }

        const firstOfAuthor =
          index === 0 ||
          (collapse && index === collapse.final + 1) ||
          comment.createdById !== commentsInThread[index - 1].createdById;
        const lastOfAuthor =
          index === commentsInThread.length - 1 ||
          comment.createdById !== commentsInThread[index + 1].createdById;

        return (
          <CommentThreadItem
            highlightedText={index === 0 ? highlightedText : undefined}
            comment={comment}
            onDelete={editor?.removeComment}
            onUpdate={editor?.updateComment}
            key={comment.id}
            firstOfThread={index === 0}
            lastOfThread={index === commentsInThread.length - 1 && !draft}
            canReply={focused && can.comment}
            firstOfAuthor={firstOfAuthor}
            lastOfAuthor={lastOfAuthor}
            previousCommentCreatedAt={commentsInThread[index - 1]?.createdAt}
            dir={document.dir}
            enableScroll={enableScroll}
            disableScroll={disableScroll}
          />
        );
      })}

      <ResizingHeightContainer hideOverflow={false} ref={replyRef}>
        {(focused || draft || commentsInThread.length === 0) && canReply && (
          <Fade timing={100}>
            <CommentForm
              onSubmit={handleSubmit}
              onSaveDraft={onSaveDraft}
              draft={draft}
              documentId={document.id}
              thread={thread}
              standalone={commentsInThread.length === 0}
              dir={document.dir}
              autoFocus={autoFocus}
              highlightedText={
                commentsInThread.length === 0 ? highlightedText : undefined
              }
            />
          </Fade>
        )}
      </ResizingHeightContainer>
      {!focused && !recessed && !draft && canReply && (
        <Reply onClick={() => setAutoFocus(true)}>{t("Reply")}…</Reply>
      )}
    </Thread>
  );
}

const Reply = styled.button`
  border: 0;
  padding: 8px;
  margin: 0;
  background: none;
  color: ${s("textTertiary")};
  font-size: 14px;
  -webkit-appearance: none;
  cursor: var(--pointer);
  transition: opacity 100ms ease-out;
  position: absolute;
  text-align: left;
  width: 100%;
  bottom: -30px;
  left: 32px;

  ${breakpoint("tablet")`
    opacity: 0;
  `}
`;

const ShowMore = styled.div<{ $dir?: "rtl" | "ltr" }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1px;
  margin-left: ${(props) => (props.$dir === "rtl" ? 0 : 32)}px;
  margin-right: ${(props) => (props.$dir !== "rtl" ? 0 : 32)}px;
  padding: 8px 12px;
  color: ${s("textTertiary")};
  background: ${(props) => darken(0.015, props.theme.backgroundSecondary)};
  cursor: var(--pointer);
  font-size: 13px;

  &: ${hover} {
    color: ${s("textSecondary")};
    background: ${s("backgroundTertiary")};
  }

  * {
    border-color: ${(props) => darken(0.015, props.theme.backgroundSecondary)};
  }
`;

const Thread = styled.div<{
  $focused: boolean;
  $recessed: boolean;
  $dir?: "rtl" | "ltr";
}>`
  margin: 12px 12px 32px;
  margin-right: ${(props) => (props.$dir !== "rtl" ? "18px" : "12px")};
  margin-left: ${(props) => (props.$dir === "rtl" ? "18px" : "12px")};
  position: relative;
  transition: opacity 100ms ease-out;

  &: ${hover} {
    ${Reply} {
      opacity: 1;
    }
  }

  ${(props) =>
    props.$recessed &&
    css`
      opacity: 0.35;
      cursor: default;
    `}
`;

export default observer(CommentThread);
