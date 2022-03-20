import { throttle } from "lodash";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
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
  const inputRef = React.useRef<Input>(null);
  const formRef = React.useRef<HTMLFormElement>(null);
  const [text, setText] = React.useState("");
  const user = useCurrentUser();
  const params = useQuery();
  const [, setIsTyping] = useTypingIndicator({
    document,
    comment: thread,
  });

  const handleCreateComment = (commentId: string) => (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    const comment = comments.get(commentId);
    if (comment) {
      comment.save({
        documentId: document?.id,
        data: {
          text,
        },
      });
      inputRef.current?.clear();
    }
  };

  const handleCreateReply = (parentCommentId: string) => (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    comments.save({
      parentCommentId,
      documentId: document?.id,
      data: {
        text,
      },
    });
    inputRef.current?.clear();
  };

  const handleChange = (event: React.FormEvent<HTMLInputElement>) => {
    setText(event.currentTarget.value);
    setIsTyping();
  };

  const handleRequestSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    formRef.current?.submit();
  };

  return (
    <Thread $highlighted={params.get("commentId") === thread.id}>
      {comments.inThread(thread.id).map((comment) => (
        <Flex gap={8} key={comment.id}>
          <Avatar src={user.avatarUrl} />
          {comment.data.text}
        </Flex>
      ))}
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
            ref={inputRef}
            name="text"
            type="textarea"
            required
            value={text}
            onChange={handleChange}
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

const Thread = styled.div<{ $highlighted: boolean }>`
  background: ${({ $highlighted }) =>
    $highlighted ? "rgba(255, 255, 255, 0.1)" : "transparent"};
`;

export default observer(CommentThread);
