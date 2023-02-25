import { throttle } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import { useHistory } from "react-router-dom";
import scrollIntoView from "smooth-scroll-into-view-if-needed";
import styled, { css } from "styled-components";
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
import useStores from "~/hooks/useStores";
import CommentForm from "./CommentForm";
import CommentThreadItem from "./CommentThreadItem";

type Props = {
  document: Document;
  comment: Comment;
  focused: boolean;
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
  const history = useHistory();
  const [, setIsTyping] = useTypingIndicator({
    document,
    comment: thread,
  });

  const commentsInThread = comments.inThread(thread.id);

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
    if (focused && topRef.current) {
      scrollIntoView(topRef.current, {
        scrollMode: "if-needed",
        behavior: "smooth",
        block: "start",
        boundary: (parent) => {
          // Prevents body and other parent elements from being scrolled
          return parent.id !== "comments";
        },
      });

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
            lastOfThread={index === commentsInThread.length - 1 && !focused}
            firstOfAuthor={firstOfAuthor}
            lastOfAuthor={lastOfAuthor}
            previousCommentCreatedAt={commentsInThread[index - 1]?.createdAt}
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

      <ResizingHeightContainer
        hideOverflow={false}
        config={{
          transition: {
            duration: 0.1,
            ease: "easeInOut",
          },
        }}
      >
        {focused && (
          <Fade timing={100}>
            <CommentForm
              documentId={document.id}
              thread={thread}
              onTyping={setIsTyping}
              standalone={commentsInThread.length === 0}
              autoFocus
            />
          </Fade>
        )}
      </ResizingHeightContainer>
    </Thread>
  );
}

const Thread = styled.div<{ $focused: boolean; $recessed: boolean }>`
  margin: 12px 18px 32px 12px;
  position: relative;
  transition: opacity 100ms ease-out;

  ${(props) =>
    props.$recessed &&
    css`
      opacity: 0.35;
      cursor: default;
    `}
`;

export default observer(CommentThread);
