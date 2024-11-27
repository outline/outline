import { m } from "framer-motion";
import { action } from "mobx";
import { observer } from "mobx-react";
import { ImageIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { VisuallyHidden } from "reakit";
import { toast } from "sonner";
import { useTheme } from "styled-components";
import { v4 as uuidv4 } from "uuid";
import { ProsemirrorData } from "@shared/types";
import { getEventFiles } from "@shared/utils/files";
import { AttachmentValidation, CommentValidation } from "@shared/validations";
import Comment from "~/models/Comment";
import { Avatar } from "~/components/Avatar";
import ButtonSmall from "~/components/ButtonSmall";
import { useDocumentContext } from "~/components/DocumentContext";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import type { Editor as SharedEditor } from "~/editor";
import useCurrentUser from "~/hooks/useCurrentUser";
import useOnClickOutside from "~/hooks/useOnClickOutside";
import useStores from "~/hooks/useStores";
import CommentEditor from "./CommentEditor";
import { Bubble } from "./CommentThreadItem";
import { HighlightedText } from "./HighlightText";

type Props = {
  /** Callback when the form is submitted. */
  onSubmit?: () => void;
  /** Callback when the draft should be saved. */
  onSaveDraft: (data: ProsemirrorData | undefined) => void;
  /** A draft comment for this thread. */
  draft?: ProsemirrorData;
  /** The document that the comment will be associated with */
  documentId: string;
  /** The comment thread that the comment will be associated with */
  thread?: Comment;
  /** Placeholder text to display in the editor */
  placeholder?: string;
  /** Whether to focus the editor on mount */
  autoFocus?: boolean;
  /** Whether to render the comment form as standalone, rather than as a reply  */
  standalone?: boolean;
  /** Whether to animate the comment form in and out */
  animatePresence?: boolean;
  /** Text to highlight at the top of the comment */
  highlightedText?: string;
  /** The text direction of the editor */
  dir?: "rtl" | "ltr";
  /** Callback when the editor is focused */
  onFocus?: () => void;
  /** Callback when the editor is blurred */
  onBlur?: () => void;
};

function CommentForm({
  documentId,
  thread,
  draft,
  onSubmit,
  onSaveDraft,
  onFocus,
  onBlur,
  autoFocus,
  standalone,
  placeholder,
  animatePresence,
  highlightedText,
  dir,
  ...rest
}: Props) {
  const { editor } = useDocumentContext();
  const formRef = React.useRef<HTMLFormElement>(null);
  const editorRef = React.useRef<SharedEditor>(null);
  const [forceRender, setForceRender] = React.useState(0);
  const [inputFocused, setInputFocused] = React.useState(autoFocus);
  const file = React.useRef<HTMLInputElement>(null);
  const theme = useTheme();
  const { t } = useTranslation();
  const { comments } = useStores();
  const user = useCurrentUser();

  const reset = React.useCallback(async () => {
    const isEmpty = editorRef.current?.isEmpty() ?? true;

    if (isEmpty && thread?.isNew) {
      if (thread.id) {
        editor?.removeComment(thread.id);
      }
      await thread.delete();
    }
  }, [editor, thread]);

  useOnClickOutside(formRef, reset);

  const handleCreateComment = action(async (event: React.FormEvent) => {
    event.preventDefault();

    onSaveDraft(undefined);
    setForceRender((s) => ++s);
    setInputFocused(false);

    const comment =
      thread ??
      new Comment(
        {
          createdAt: new Date().toISOString(),
          documentId,
          data: draft,
          reactions: [],
        },
        comments
      );

    comment
      .save({
        documentId,
        data: draft,
      })
      .then(() => onSubmit?.())
      .catch(() => {
        comment.isNew = true;
        toast.error(t("Error creating comment"));
      });

    // optimistically update the comment model
    comment.isNew = false;
    comment.createdById = user.id;
    comment.createdBy = user;
  });

  const handleCreateReply = action(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) {
      return;
    }

    onSaveDraft(undefined);
    setForceRender((s) => ++s);

    const comment = new Comment(
      {
        createdAt: new Date().toISOString(),
        parentCommentId: thread?.id,
        documentId,
        data: draft,
        reactions: [],
      },
      comments
    );

    comment.id = uuidv4();
    comments.add(comment);

    comment
      .save()
      .then(() => onSubmit?.())
      .catch(() => {
        comments.remove(comment.id);
        comment.isNew = true;
        toast.error(t("Error creating comment"));
      });

    // optimistically update the comment model
    comment.isNew = false;
    comment.createdById = user.id;
    comment.createdBy = user;

    // re-focus the comment editor
    setTimeout(() => {
      editorRef.current?.focusAtStart();
    }, 0);
  });

  const handleChange = (
    value: (asString: boolean, trim: boolean) => ProsemirrorData
  ) => {
    const text = value(true, true);
    onSaveDraft(text ? value(false, true) : undefined);
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

  const handleCancel = async () => {
    onSaveDraft(undefined);
    setForceRender((s) => ++s);
    setInputFocused(false);
    await reset();
  };

  const handleFocus = () => {
    onFocus?.();
    setInputFocused(true);
  };

  const handleBlur = () => {
    onBlur?.();
  };

  const handleFilePicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    event.preventDefault();

    const files = getEventFiles(event);
    if (!files.length) {
      return;
    }

    return editorRef.current?.insertFiles(event, files);
  };

  const handleImageUpload = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    file.current?.click();
  };

  // Focus the editor when it's a new comment just mounted, after a delay as the
  // editor is mounted within a fade transition.
  React.useEffect(() => {
    setTimeout(() => {
      if (autoFocus) {
        editorRef.current?.focusAtStart();
      }
    }, 0);
  }, [autoFocus]);

  const presence = animatePresence
    ? {
        initial: {
          opacity: 0,
          marginBottom: -100,
        },
        animate: {
          opacity: 1,
          marginBottom: 0,
          transition: {
            type: "spring",
            bounce: 0.1,
          },
        },
        exit: {
          opacity: 0,
          marginBottom: -100,
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
      <VisuallyHidden>
        <input
          ref={file}
          type="file"
          onChange={handleFilePicked}
          accept={AttachmentValidation.imageContentTypes.join(", ")}
          tabIndex={-1}
        />
      </VisuallyHidden>
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
          {highlightedText && (
            <HighlightedText>{highlightedText}</HighlightedText>
          )}
          <CommentEditor
            key={`${forceRender}`}
            ref={editorRef}
            defaultValue={draft}
            onChange={handleChange}
            onSave={handleSave}
            onFocus={handleFocus}
            onBlur={handleBlur}
            maxLength={CommentValidation.maxLength}
            placeholder={
              placeholder ||
              // isNew is only the case for comments that exist in draft state,
              // they are marks in the document, but not yet saved to the db.
              (thread?.isNew
                ? `${t("Add a comment")}…`
                : `${t("Add a reply")}…`)
            }
          />
          {(inputFocused || draft) && (
            <Flex justify="space-between" reverse={dir === "rtl"} gap={8}>
              <Flex gap={8}>
                <ButtonSmall type="submit" borderOnHover>
                  {thread && !thread.isNew ? t("Reply") : t("Post")}
                </ButtonSmall>
                <ButtonSmall onClick={handleCancel} neutral borderOnHover>
                  {t("Cancel")}
                </ButtonSmall>
              </Flex>
              <Tooltip delay={500} content={t("Upload image")} placement="top">
                <NudeButton onClick={handleImageUpload}>
                  <ImageIcon color={theme.textTertiary} />
                </NudeButton>
              </Tooltip>
            </Flex>
          )}
        </Bubble>
      </Flex>
    </m.form>
  );
}

export default observer(CommentForm);
