import { m } from "framer-motion";
import { action } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { CommentValidation } from "@shared/validations";
import Comment from "~/models/Comment";
import Avatar from "~/components/Avatar";
import ButtonSmall from "~/components/ButtonSmall";
import { useDocumentContext } from "~/components/DocumentContext";
import Flex from "~/components/Flex";
import type { Editor as SharedEditor } from "~/editor";
import useCurrentUser from "~/hooks/useCurrentUser";
import useOnClickOutside from "~/hooks/useOnClickOutside";
import usePersistedState from "~/hooks/usePersistedState";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import CommentEditor from "./CommentEditor";
import { Bubble } from "./CommentThreadItem";

type Props = {
  documentId: string;
  thread: Comment;
  placeholder?: string;
  autoFocus?: boolean;
  standalone?: boolean;
  animatePresence?: boolean;
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
  autoFocus,
  standalone,
  placeholder,
  animatePresence,
  ...rest
}: Props) {
  const { editor } = useDocumentContext();
  const [data, setData] = usePersistedState<Record<string, any> | undefined>(
    `draft-${documentId}-${thread.id}`,
    undefined
  );
  const formRef = React.useRef<HTMLFormElement>(null);
  const editorRef = React.useRef<SharedEditor>(null);
  const [dir, setDir] = React.useState<"ltr" | "rtl">("ltr");
  const [forceRender, setForceRender] = React.useState(0);
  const { t } = useTranslation();
  const { showToast } = useToasts();
  const { comments } = useStores();
  const user = useCurrentUser();
  const isEmpty = editorRef.current?.isEmpty() ?? true;

  useOnClickOutside(formRef, () => {
    if (isEmpty && thread.isNew) {
      if (thread.id) {
        editor?.removeComment(thread.id);
      }
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

    // optimistically update the comment model
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

  const handleClickPadding = () => {
    if (editorRef.current?.isBlurred) {
      editorRef.current?.focusAtStart();
    }
  };

  const handleCancel = () => {
    setData(undefined);
    setForceRender((s) => ++s);
  };

  // Focus the editor when it's a new comment just mounted, after a delay as the
  // editor is mounted within a fade transition.
  React.useEffect(() => {
    setTimeout(() => {
      if (thread.isNew && autoFocus !== false) {
        editorRef.current?.focusAtStart();
      }
    }, 0);
  }, [thread.isNew, autoFocus]);

  const presence = animatePresence
    ? {
        initial: {
          opacity: 0,
          translateY: 100,
        },
        animate: {
          opacity: 1,
          translateY: 0,
          transition: {
            type: "spring",
            bounce: 0.1,
          },
        },
        exit: {
          opacity: 0,
          translateY: 100,
          scale: 0.98,
        },
      }
    : {};

  return (
    <m.form
      ref={formRef}
      onSubmit={thread?.isNew ? handleCreateComment : handleCreateReply}
      {...presence}
      {...rest}
    >
      <Flex gap={8} align="flex-start" reverse={dir === "rtl"}>
        <Avatar model={user} size={24} style={{ marginTop: 8 }} />
        <Bubble
          gap={10}
          onClick={handleClickPadding}
          $lastOfThread
          $firstOfAuthor
          $firstOfThread={standalone}
          column
        >
          <CommentEditor
            key={`${forceRender}`}
            ref={editorRef}
            onChangeDir={setDir}
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

          {!isEmpty && (
            <Flex justify={dir === "rtl" ? "flex-end" : "flex-start"} gap={8}>
              <ButtonSmall type="submit" borderOnHover>
                {thread.isNew ? t("Post") : t("Reply")}
              </ButtonSmall>
              <ButtonSmall onClick={handleCancel} neutral borderOnHover>
                {t("Cancel")}
              </ButtonSmall>
            </Flex>
          )}
        </Bubble>
      </Flex>
    </m.form>
  );
}

export default observer(CommentForm);
