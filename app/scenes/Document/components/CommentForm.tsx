import * as React from "react";
import { useTranslation } from "react-i18next";
import { CommentValidation } from "@shared/validations";
import Comment from "~/models/Comment";
import Avatar from "~/components/Avatar";
import Flex from "~/components/Flex";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePersistedState from "~/hooks/usePersistedState";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import CommentEditor from "./CommentEditor";

type Props = {
  documentId: string;
  thread: Comment;
  onTyping: () => void;
};

function CommentForm({ documentId, thread, onTyping, ...rest }: Props) {
  const [data, setData] = usePersistedState<Record<string, any> | undefined>(
    `draft-${documentId}-${thread.id}`,
    undefined
  );
  const formRef = React.useRef<HTMLFormElement>(null);
  const [forceRender, setForceRender] = React.useState(0);
  const { t } = useTranslation();
  const { showToast } = useToasts();
  const { comments } = useStores();
  const user = useCurrentUser();

  const handleCreateComment = async (event: React.FormEvent) => {
    event.preventDefault();

    const comment = comments.get(thread.id);
    if (comment) {
      setData(undefined);
      setForceRender((s) => ++s);

      try {
        await comment.save({
          documentId,
          data,
        });
      } catch (error) {
        showToast(t("Error creating comment"), { type: "error" });
      }
    }
  };

  const handleCreateReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!data) {
      return;
    }

    setData(undefined);
    setForceRender((s) => ++s);

    try {
      await comments.save({
        parentCommentId: thread?.id,
        documentId,
        data,
      });
    } catch (error) {
      showToast(t("Error creating comment"), { type: "error" });
    }
  };

  const handleChange = (value: (asString: boolean) => Record<string, any>) => {
    setData(value(false));
    onTyping();
  };

  const handleSave = () => {
    formRef.current?.dispatchEvent(
      new Event("submit", { cancelable: true, bubbles: true })
    );
  };

  return (
    <form
      ref={formRef}
      onSubmit={thread?.isNew ? handleCreateComment : handleCreateReply}
      {...rest}
    >
      <Flex gap={8}>
        <Avatar model={user} />
        <CommentEditor
          key={`${forceRender}`}
          onChange={handleChange}
          onSave={handleSave}
          maxLength={CommentValidation.maxLength}
          autoFocus={thread.isNew}
          placeholder={
            // isNew is only the case for comments that exist in draft state,
            // they are marks in the document, but not yet saved to the db.
            thread.isNew ? `${t("Add a comment")}…` : `${t("Add a reply")}…`
          }
        />
      </Flex>
    </form>
  );
}

export default React.forwardRef(CommentForm);
