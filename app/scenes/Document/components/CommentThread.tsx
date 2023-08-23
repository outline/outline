import throttle from "lodash/throttle";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import scrollIntoView from "smooth-scroll-into-view-if-needed";
import styled, { css } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s } from "@shared/styles";
import Comment from "~/models/Comment";
import Document from "~/models/Document";
import Avatar from "~/components/Avatar";
import Fade from "~/components/Fade";
import Flex from "~/components/Flex";
import { ResizingHeightContainer } from "~/components/ResizingHeightContainer";
import Typing from "~/components/Typing";
import { WebsocketContext } from "~/components/WebsocketProvider";
import useCurrentUser from "~/hooks/useCurrentUser";
import useOnClickOutside from "~/hooks/useOnClickOutside";
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
};

function useTypingIndicator({
  document,
  comment,
}: Omit<Props, "focused" | "recessed">): [undefined, () => void] {
  const socket = React.useContext(WebsocketContext);

  const setIsTyping = React.useMemo(
    () =>
      throttle(() => {
        socket?.emit("typing", {
          documentId: document.id,
          commentId: comment.id,
        });
      }, 500),
    [socket, document.id, comment.id]
  );

  return [undefined, setIsTyping];
}

function CommentThread({
  comment: thread,
  document,
  recessed,
  focused,
}: Props) {
  const { comments } = useStores();
  const topRef = React.useRef<HTMLDivElement>(null);
  const user = useCurrentUser();
  const { t } = useTranslation();
  const history = useHistory();
  const [autoFocus, setAutoFocus] = React.useState(thread.isNew);
  const [, setIsTyping] = useTypingIndicator({
    document,
    comment: thread,
  });
  const can = usePolicy(document.id);

  const commentsInThread = comments
    .inThread(thread.id)
    .filter((comment) => !comment.isNew);

  useOnClickOutside(topRef, (event) => {
    if (
      focused &&
      !(event.target as HTMLElement).classList.contains("comment")
    ) {
      history.replace({
        pathname: window.location.pathname,
        state: { commentId: undefined },
      });
    }
  });

  const handleClickThread = () => {
    history.replace({
      pathname: window.location.pathname.replace(/\/history$/, ""),
      state: { commentId: thread.id },
    });
  };

  React.useEffect(() => {
    if (!focused && autoFocus) {
      setAutoFocus(false);
    }
  }, [focused, autoFocus]);

  React.useEffect(() => {
    if (focused) {
      // If the thread is already visible, scroll it into view immediately,
      // otherwise wait for the sidebar to appear.
      const isVisible =
        (topRef.current?.getBoundingClientRect().left ?? 0) < window.innerWidth;

      setTimeout(
        () => {
          if (!topRef.current) {
            return;
          }
          return scrollIntoView(topRef.current, {
            scrollMode: "if-needed",
            behavior: "smooth",
            block: "end",
            boundary: (parent) =>
              // Prevents body and other parent elements from being scrolled
              parent.id !== "comments",
          });
        },
        isVisible ? 0 : sidebarAppearDuration
      );

      setTimeout(() => {
        const commentMarkElement = window.document?.getElementById(
          `comment-${thread.id}`
        );
        commentMarkElement?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 0);
    }
  }, [focused, thread.id]);

  return (
    <Thread
      ref={topRef}
      $focused={focused}
      $recessed={recessed}
      $dir={document.dir}
      onClick={handleClickThread}
    >
      {commentsInThread.map((comment, index) => {
        const firstOfAuthor =
          index === 0 ||
          comment.createdById !== commentsInThread[index - 1].createdById;
        const lastOfAuthor =
          index === commentsInThread.length - 1 ||
          comment.createdById !== commentsInThread[index + 1].createdById;

        return (
          <CommentThreadItem
            comment={comment}
            key={comment.id}
            firstOfThread={index === 0}
            lastOfThread={index === commentsInThread.length - 1}
            canReply={focused && can.comment}
            firstOfAuthor={firstOfAuthor}
            lastOfAuthor={lastOfAuthor}
            previousCommentCreatedAt={commentsInThread[index - 1]?.createdAt}
            dir={document.dir}
          />
        );
      })}

      {thread.currentlyTypingUsers
        .filter((typing) => typing.id !== user.id)
        .map((typing) => (
          <Flex gap={8} key={typing.id}>
            <Avatar model={typing} size={24} />
            <Typing />
          </Flex>
        ))}

      <ResizingHeightContainer hideOverflow={false}>
        {(focused || commentsInThread.length === 0) && can.comment && (
          <Fade timing={100}>
            <CommentForm
              documentId={document.id}
              thread={thread}
              onTyping={setIsTyping}
              standalone={commentsInThread.length === 0}
              dir={document.dir}
              autoFocus={autoFocus}
            />
          </Fade>
        )}
      </ResizingHeightContainer>
      {!focused && !recessed && can.comment && (
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
