import { throttle } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import { useHistory } from "react-router-dom";
import scrollIntoView from "smooth-scroll-into-view-if-needed";
import styled from "styled-components";
import Comment from "~/models/Comment";
import Document from "~/models/Document";
import Avatar from "~/components/Avatar";
import Flex from "~/components/Flex";
import { SocketContext } from "~/components/SocketProvider";
import Typing from "~/components/Typing";
import useCurrentUser from "~/hooks/useCurrentUser";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import CommentForm from "./CommentForm";
import CommentThreadItem from "./CommentThreadItem";

type Props = {
  document: Document;
  comment: Comment;
};

function useTypingIndicator({
  document,
  comment,
}: Props): [undefined, () => void] {
  const socket = React.useContext(SocketContext);

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

function CommentThread({ comment: thread, document }: Props) {
  const { comments } = useStores();
  const topRef = React.useRef<HTMLDivElement>(null);
  const user = useCurrentUser();
  const params = useQuery();
  const history = useHistory();
  const [, setIsTyping] = useTypingIndicator({
    document,
    comment: thread,
  });

  const commentsInThread = comments.inThread(thread.id);
  const highlighted = params.get("commentId") === thread.id;

  const handleClickThread = () => {
    history.replace({
      pathname: window.location.pathname.replace(/\/history$/, ""),
      search: `?commentId=${thread.id}`,
    });
  };

  React.useEffect(() => {
    if (highlighted && topRef.current) {
      scrollIntoView(topRef.current, {
        scrollMode: "if-needed",
        behavior: "smooth",
        block: "start",
        boundary: (parent) => {
          // Prevents body and other parent elements from being scrolled
          return parent.id !== "comments";
        },
      });
    }
  }, [highlighted]);

  return (
    <Thread ref={topRef} $highlighted={highlighted} onClick={handleClickThread}>
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
            <Avatar src={typing.avatarUrl} size={24} />
            <Typing />
          </Flex>
        ))}
      <CommentForm
        documentId={document.id}
        thread={thread}
        onTyping={setIsTyping}
      />
    </Thread>
  );
}

const Thread = styled.div<{ $highlighted: boolean }>`
  margin: 0 18px 12px 12px;

  outline: ${(props) =>
    props.$highlighted ? `2px solid ${props.theme.brand.marine}` : "none"};
`;

export default observer(CommentThread);
