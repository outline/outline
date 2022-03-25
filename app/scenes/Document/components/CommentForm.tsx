import * as React from "react";
import { useTranslation } from "react-i18next";
import { MAX_COMMENT_LENGTH } from "@shared/constants";
import Comment from "~/models/Comment";
import Avatar from "~/components/Avatar";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePersistedState from "~/hooks/usePersistedState";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";

type Props = {
  documentId: string;
  thread: Comment;
  onTyping: () => void;
};

function CommentForm({ documentId, thread, onTyping }: Props) {
  const [text, setText] = usePersistedState(
    `draft-${documentId}-${thread.id}`,
    ""
  );
  const formRef = React.useRef<HTMLFormElement>(null);
  const { t } = useTranslation();
  const { showToast } = useToasts();
  const { comments } = useStores();
  const user = useCurrentUser();

  const handleCreateComment = async (event: React.FormEvent) => {
    event.preventDefault();

    const comment = comments.get(thread.id);
    if (comment) {
      setText("");

      try {
        await comment.save({
          documentId: documentId,
          data: {
            text,
          },
        });
      } catch (error) {
        showToast(t("Error creating comment"), { type: "error" });
      }
    }
  };

  const handleCreateReply = async (event: React.FormEvent) => {
    event.preventDefault();

    setText("");

    try {
      await comments.save({
        parentCommentId: thread?.id,
        documentId: documentId,
        data: {
          text,
        },
      });
    } catch (error) {
      showToast(t("Error creating comment"), { type: "error" });
    }
  };

  const handleChange = (event: React.FormEvent<HTMLInputElement>) => {
    setText(event.currentTarget.value);
    onTyping();
  };

  const handleRequestSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    formRef.current?.dispatchEvent(
      new Event("submit", { cancelable: true, bubbles: true })
    );
  };

  return (
    <form
      ref={formRef}
      onSubmit={thread?.isNew ? handleCreateComment : handleCreateReply}
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
  );
}

export default React.forwardRef(CommentForm);
