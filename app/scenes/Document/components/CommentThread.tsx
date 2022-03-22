import { differenceInMilliseconds } from "date-fns";
import { throttle } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import scrollIntoView from "smooth-scroll-into-view-if-needed";
import styled from "styled-components";
import { MAX_COMMENT_LENGTH } from "@shared/constants";
import Comment from "~/models/Comment";
import Document from "~/models/Document";
import Avatar from "~/components/Avatar";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import { SocketContext } from "~/components/SocketProvider";
import useCurrentUser from "~/hooks/useCurrentUser";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import CommentListItem from "./Comment";

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
  const { t } = useTranslation();
  const formRef = React.useRef<HTMLFormElement>(null);
  const topRef = React.useRef<HTMLDivElement>(null);
  const [text, setText] = React.useState("");
  const user = useCurrentUser();
  const params = useQuery();
  const [, setIsTyping] = useTypingIndicator({
    document,
    comment: thread,
  });

  const handleCreateComment = (commentId: string) => async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    const comment = comments.get(commentId);
    if (comment) {
      setText("");
      await comment.save({
        documentId: document?.id,
        data: {
          text,
        },
      });
    }
  };

  const handleCreateReply = (parentCommentId: string) => async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setText("");
    await comments.save({
      parentCommentId,
      documentId: document?.id,
      data: {
        text,
      },
    });
  };

  const handleChange = (event: React.FormEvent<HTMLInputElement>) => {
    setText(event.currentTarget.value);
    setIsTyping();
  };

  const handleRequestSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    formRef.current?.dispatchEvent(
      new Event("submit", { cancelable: true, bubbles: true })
    );
  };

  const commentsInThread = comments.inThread(thread.id);
  const highlighted = params.get("commentId") === thread.id;

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
    <Thread ref={topRef}>
      {commentsInThread.map((comment, index) => {
        const firstOfAuthor =
          index === 0 ||
          comment.createdById !== commentsInThread[index - 1].createdById;
        const lastOfAuthor =
          index === commentsInThread.length - 1 ||
          comment.createdById !== commentsInThread[index + 1].createdById;
        const msSincePreviousComment =
          index === 0
            ? 0
            : differenceInMilliseconds(
                new Date(comment.createdAt),
                new Date(commentsInThread[index - 1].createdAt)
              );

        return (
          <CommentListItem
            comment={comment}
            key={comment.id}
            firstOfAuthor={firstOfAuthor}
            lastOfAuthor={lastOfAuthor}
            msSincePreviousComment={msSincePreviousComment}
            highlighted={highlighted}
          />
        );
      })}
      {thread.currentlyTypingUsers
        .filter((typing) => typing.id !== user.id)
        .map((typing) => (
          <p>
            <Avatar src={user.avatarUrl} size={24} /> {typing.name} is typing…
          </p>
        ))}
      <form
        ref={formRef}
        onSubmit={
          thread.isNew
            ? handleCreateComment(thread.id)
            : handleCreateReply(thread.id)
        }
      >
        <Flex gap={8}>
          <Avatar src={user.avatarUrl} />
          <Input
            name="text"
            type="textarea"
            required
            value={text}
            onChange={handleChange}
            minLength={1}
            maxLength={MAX_COMMENT_LENGTH}
            autoFocus={thread.isNew}
            onRequestSubmit={handleRequestSubmit}
            placeholder={
              thread.isNew ? `${t("Add a comment")}…` : `${t("Reply")}…`
            }
          />
          <Button type="submit" aria-label={t("Comment")}>
            ⬆
          </Button>
        </Flex>
      </form>
    </Thread>
  );
}

const Thread = styled.div`
  margin: 0 12px;
`;

export default observer(CommentThread);
