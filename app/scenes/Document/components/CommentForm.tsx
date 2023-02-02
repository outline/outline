import { action } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { CommentValidation } from "@shared/validations";
import Comment from "~/models/Comment";
import Avatar from "~/components/Avatar";
import Button from "~/components/Button";
import Fade from "~/components/Fade";
import Flex from "~/components/Flex";
import type { Editor as SharedEditor } from "~/editor";
import useCurrentUser from "~/hooks/useCurrentUser";
import useOnClickOutside from "~/hooks/useOnClickOutside";
import usePersistedState from "~/hooks/usePersistedState";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import CommentEditor from "./CommentEditor";

type Props = {
  documentId: string;
  thread: Comment;
  placeholder?: string;
  onTyping?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onClickOutside?: (event: MouseEvent | TouchEvent) => void;
};

function CommentForm({
  documentId,
  thread,
  onTyping,
  onFocus,
  onBlur,
  onClickOutside,
  placeholder,
  ...rest
}: Props) {
  const [data, setData] = usePersistedState<Record<string, any> | undefined>(
    `draft-${documentId}-${thread.id}`,
    undefined
  );
  const formRef = React.useRef<HTMLFormElement>(null);
  const editorRef = React.useRef<SharedEditor>(null);
  const [forceRender, setForceRender] = React.useState(0);
  const { t } = useTranslation();
  const { showToast } = useToasts();
  const { comments } = useStores();
  const user = useCurrentUser();
  const isEmpty = editorRef.current?.isEmpty() ?? true;

  useOnClickOutside(formRef, () => {
    if (isEmpty && thread.isNew) {
      thread.delete();
    }
  });

  const handleCreateComment = action(async (event: React.FormEvent) => {
    event.preventDefault();

    setData(undefined);
    setForceRender((s) => ++s);

    thread
      .save({
        documentId,
        data,
      })
      .catch(() => {
        thread.isNew = true;
        showToast(t("Error creating comment"), { type: "error" });
      });

    // optimisticly update the comment model
    thread.isNew = false;
    thread.createdBy = user;
  });

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

  const handleChange = (
    value: (asString: boolean, trim: boolean) => Record<string, any>
  ) => {
    setData(value(false, true));
    onTyping?.();
  };

  const handleSave = () => {
    formRef.current?.dispatchEvent(
      new Event("submit", { cancelable: true, bubbles: true })
    );
  };

  // Focus the editor when it's a new comment just mounted, after a delay as the
  // editor is mounted within a fade transition.
  React.useEffect(() => {
    setTimeout(() => {
      if (thread.isNew) {
        editorRef.current?.focusAtStart();
      }
    }, 0);
  }, [thread.isNew]);

  return (
    <form
      ref={formRef}
      onSubmit={thread?.isNew ? handleCreateComment : handleCreateReply}
      {...rest}
    >
      <Flex gap={8}>
        <Avatar model={user} />
        <Flex column>
          <CommentEditor
            key={`${forceRender}`}
            ref={editorRef}
            onChange={handleChange}
            onSave={handleSave}
            onFocus={onFocus}
            onBlur={onBlur}
            maxLength={CommentValidation.maxLength}
            placeholder={
              placeholder ||
              // isNew is only the case for comments that exist in draft state,
              // they are marks in the document, but not yet saved to the db.
              (thread.isNew ? `${t("Add a comment")}…` : `${t("Add a reply")}…`)
            }
          />
          <Fade>
            {!isEmpty && (
              <Flex align="flex-end">
                <Button type="submit" neutral borderOnHover>
                  Post
                </Button>
              </Flex>
            )}
          </Fade>
        </Flex>
      </Flex>
    </form>
  );
}

export default observer(CommentForm);
