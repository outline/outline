import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { v4 as uuidv4 } from "uuid";
import type { Transition } from "framer-motion";
import { m } from "framer-motion";
import { action } from "mobx";
import { observer } from "mobx-react";
import { GlobeIcon, ImageIcon, PadlockIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled, { css, useTheme } from "styled-components";
import { ellipsis, s } from "@shared/styles";
import { parseReactionShorthand } from "@shared/editor/lib/emoji";
import type { ProsemirrorData } from "@shared/types";
import { getEventFiles } from "@shared/utils/files";
import { AttachmentValidation, CommentValidation } from "@shared/validations";
import Comment from "~/models/Comment";
import { Avatar } from "~/components/Avatar";
import Text from "~/components/Text";
import ButtonSmall from "~/components/ButtonSmall";
import { useDocumentContext } from "~/components/DocumentContext";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import type { Editor as SharedEditor } from "~/editor";
import useCurrentUser from "~/hooks/useCurrentUser";
import useOnClickOutside from "~/hooks/useOnClickOutside";
import usePersistedState from "~/hooks/usePersistedState";
import useStores from "~/hooks/useStores";
import { Bubble } from "./CommentThreadItem";
import { GuestNameDialog } from "./GuestNameDialog";
import { HighlightedText } from "./HighlightText";
import lazyWithRetry from "~/utils/lazyWithRetry";
import { mergeRefs } from "react-merge-refs";
import { HStack } from "~/components/primitives/HStack";
import useShare from "@shared/hooks/useShare";

const CommentEditor = lazyWithRetry(() => import("./CommentEditor"));

/**
 * Local storage key under which the display name of a visitor commenting on a
 * public share is remembered, so it is only ever asked for once.
 */
const GuestNameKey = "guestCommentName";

/**
 * Local storage key under which the optional email address of a visitor
 * commenting on a public share is remembered, so it is only ever asked for
 * once.
 */
const GuestEmailKey = "guestCommentEmail";

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
  /** Callback when the editor is focused */
  onFocus?: () => void;
  /** Callback when the editor is blurred */
  onBlur?: () => void;
  /** Callback when user presses up arrow at the start of the editor */
  onUpArrowAtStart?: () => void;
  /**
   * Callback invoked when a new top-level comment is about to be created,
   * just before it is added to the store. Receives the comment model, which
   * may be modified, e.g. to set a pending anchor before submission.
   */
  onBeforeCreate?: (comment: Comment) => void;
};

function CommentForm({
  documentId,
  thread,
  draft,
  onSubmit,
  onSaveDraft,
  onFocus,
  onBlur,
  onUpArrowAtStart,
  onBeforeCreate,
  autoFocus,
  standalone,
  placeholder,
  animatePresence,
  highlightedText,
  ...rest
}: Props) {
  const { editor } = useDocumentContext();
  const formRef = React.useRef<HTMLFormElement>(null);
  const editorRef = React.useRef<SharedEditor>(null);
  const [forceRender, setForceRender] = React.useState(0);
  const [inputFocused, setInputFocused] = React.useState(autoFocus);
  const file = React.useRef<HTMLInputElement>(null);
  const hasFocusedOnMount = React.useRef(false);
  const theme = useTheme();
  const { t } = useTranslation();
  const { comments, dialogs, documents } = useStores();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const { isShare } = useShare();
  const [guestName, setGuestName] = usePersistedState(
    GuestNameKey,
    user?.name ?? ""
  );
  const [guestEmail, setGuestEmail] = usePersistedState<string>(
    GuestEmailKey,
    ""
  );
  const [isPublic, setIsPublic] = React.useState(
    thread && !thread.isNew ? thread.isPublic : false
  );
  const document = documents.get(documentId);
  const author = React.useMemo(
    () => user ?? { avatarUrl: null, name: guestName || t("Guest") },
    [user, guestName, t]
  );

  // A new thread always lets a member choose its visibility, provided the
  // document is reachable through a published share. A reply may only
  // choose between public and internal when replying within an already
  // public thread — a reply within an internal thread is always internal.
  const canChooseVisibility =
    !isShare &&
    !!document?.isPubliclyShared &&
    (!thread || thread.isNew || thread.isPublic);

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

  /**
   * Refreshes the document after a successful comment save when viewing a
   * public share, so that the newly created inline anchor is reflected in
   * the document content the guest sees.
   */
  const refreshDocumentAfterShare = React.useCallback(() => {
    if (isShare) {
      void documents.fetch(documentId, { force: true }).catch(() => {
        toast.error(t("Error loading document"));
      });
    }
  }, [isShare, documents, documentId, t]);

  /**
   * Asks the visitor for the name (and optionally an email) to publish their
   * comments under, remembering both so that they are not requested again.
   *
   * @returns the chosen name and email, or undefined if the dialog was
   * dismissed.
   */
  const promptForGuestName = React.useCallback(
    () =>
      new Promise<{ name: string; email?: string } | undefined>((resolve) => {
        dialogs.openModal({
          title: t("Your name"),
          content: (
            <GuestNameDialog
              defaultValue={guestName}
              defaultEmail={guestEmail}
              onSubmit={(name, email) => {
                setGuestName(name);
                setGuestEmail(email ?? "");
                resolve({ name, email });
              }}
            />
          ),
          onClose: () => resolve(undefined),
        });
      }),
    [dialogs, guestName, guestEmail, setGuestName, setGuestEmail, t]
  );

  React.useEffect(() => {
    window.addEventListener("beforeunload", reset);
    return () => window.removeEventListener("beforeunload", reset);
  }, [reset]);

  const createComment = action((authorName?: string, authorEmail?: string) => {
    if (!draft || thread?.isSaving) {
      return;
    }

    onSaveDraft(undefined);
    setForceRender((s) => ++s);
    setInputFocused(false);

    const commentDraft = draft;
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
        guestName: authorName,
        guestEmail: authorEmail,
        isPublic: canChooseVisibility ? isPublic : undefined,
        ...thread?.pendingAnchor,
      })
      // Note: pendingAnchor is intentionally kept after saving — it continues
      // to provide the highlighted snippet until the server-applied mark
      // arrives through the collaboration sync.
      .then(() => {
        onSubmit?.();
        refreshDocumentAfterShare();
      })
      .catch(() => {
        onSaveDraft(commentDraft);
        setForceRender((s) => ++s);

        comment.isNew = true;
        toast.error(t("Error creating comment"));
      });

    // optimistically update the comment model. Setting the data here, rather
    // than waiting for save() to resolve, avoids a frame where the rendered
    // comment is empty before the saved data is applied.
    if (draft) {
      comment.data = draft;
    }
    if (user && !isShare) {
      comment.isNew = false;
      comment.createdById = user.id;
      comment.createdBy = user;
    }
  });

  const createReply = action((authorName?: string, authorEmail?: string) => {
    if (!draft) {
      return;
    }

    // "+:emoji:" shorthand: react to the comment above instead of replying.
    if (user && !isShare && thread && !thread.isNew) {
      const emoji = parseReactionShorthand(draft);
      if (emoji) {
        const target = comments
          .inThread(thread.id)
          .filter((comment) => !comment.isNew)
          .pop();

        if (target) {
          onSaveDraft(undefined);
          setForceRender((s) => ++s);
          void target.addReaction({ emoji, user });
          onSubmit?.();

          // re-focus the comment editor
          setTimeout(() => {
            editorRef.current?.focusAtStart();
          }, 0);
          return;
        }
      }
    }

    const commentDraft = draft;
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
    if (!thread) {
      onBeforeCreate?.(comment);
    }
    comments.add(comment);

    comment
      .save({
        documentId,
        parentCommentId: thread?.id,
        data: draft,
        guestName: authorName,
        guestEmail: authorEmail,
        isPublic: canChooseVisibility ? isPublic : undefined,
        ...comment.pendingAnchor,
      })
      .then(() => {
        onSubmit?.();
        refreshDocumentAfterShare();
      })
      .catch(() => {
        onSaveDraft(commentDraft);
        setForceRender((s) => ++s);

        comments.remove(comment.id);
        comment.isNew = true;
        toast.error(t("Error creating comment"));
      });

    // optimistically update the comment model
    if (user && !isShare) {
      comment.isNew = false;
      comment.createdById = user.id;
      comment.createdBy = user;
    }

    // re-focus the comment editor
    setTimeout(() => {
      editorRef.current?.focusAtStart();
    }, 0);
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!draft) {
      return;
    }

    // Visitors of a public share are identified by a name they supply, which
    // is only asked for the first time they comment. An email is optionally
    // collected at the same time, to notify them of replies.
    let authorName: string | undefined;
    let authorEmail: string | undefined;
    if (isShare) {
      if (guestName.trim()) {
        authorName = guestName.trim();
        authorEmail = guestEmail.trim() || undefined;
      } else {
        const result = await promptForGuestName();
        authorName = result?.name.trim();
        authorEmail = result?.email?.trim();
      }
      if (!authorName) {
        return;
      }
    }

    if (thread?.isNew) {
      createComment(authorName, authorEmail);
    } else {
      createReply(authorName, authorEmail);
    }
  };

  const handleChangeGuestName = async (event: React.MouseEvent) => {
    event.preventDefault();
    await promptForGuestName();
  };

  const handleToggleVisibility = (event: React.MouseEvent) => {
    event.preventDefault();
    setIsPublic((value) => !value);
  };

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

  const handleClickPadding = (event: React.MouseEvent) => {
    // Clicks that land on a control inside the bubble must not pull focus
    // back into the editor.
    if (
      event.target instanceof Element &&
      event.target.closest("button, a, input, textarea, select")
    ) {
      return;
    }

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

  const handleUpArrowAtStart = () => {
    if (onUpArrowAtStart) {
      onUpArrowAtStart();
      setInputFocused(false);
    }
  };

  // Focus the editor when it's a new comment just mounted
  const handleMounted = React.useCallback(
    (ref: SharedEditor | null) => {
      if (autoFocus && ref && !hasFocusedOnMount.current) {
        if (!draft) {
          ref.focusAtStart();
        }
        hasFocusedOnMount.current = true;
      }
    },
    [autoFocus, draft]
  );

  const presence = animatePresence
    ? {
        initial: {
          opacity: 0,
          y: 10,
        },
        animate: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.2,
            ease: "easeOut",
          } satisfies Transition,
        },
        exit: {
          opacity: 0,
          y: 10,
          transition: {
            duration: 0.2,
            ease: "easeOut",
          } satisfies Transition,
        },
      }
    : {};

  return (
    <m.form ref={formRef} onSubmit={handleSubmit} {...presence} {...rest}>
      <VisuallyHidden.Root>
        <input
          ref={file}
          type="file"
          onChange={handleFilePicked}
          accept={AttachmentValidation.imageContentTypes.join(", ")}
          tabIndex={-1}
        />
      </VisuallyHidden.Root>
      <Flex gap={8} align="flex-start">
        {standalone ? (
          <m.div
            style={{ marginTop: 8 }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Avatar model={author} size={24} />
          </m.div>
        ) : (
          <Avatar model={author} size={24} style={{ marginTop: 8 }} />
        )}
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
          <React.Suspense fallback={<div style={{ height: 24 }} />}>
            <CommentEditor
              key={`${forceRender}`}
              ref={mergeRefs([editorRef, handleMounted])}
              defaultValue={draft}
              onChange={handleChange}
              onSave={handleSave}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onUpArrowAtStart={handleUpArrowAtStart}
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
          </React.Suspense>
          {(inputFocused || draft) && (
            <Flex justify="space-between" gap={8}>
              <HStack>
                <ButtonSmall type="submit" borderOnHover>
                  {thread && !thread.isNew ? t("Reply") : t("Post")}
                </ButtonSmall>
                <ButtonSmall onClick={handleCancel} neutral borderOnHover>
                  {t("Cancel")}
                </ButtonSmall>
              </HStack>
              <HStack spacing={4}>
                {isShare && guestName && (
                  <Tooltip content={t("Change your name")} placement="top">
                    <GuestNameButton
                      type="button"
                      onClick={handleChangeGuestName}
                    >
                      <Text type="tertiary" size="xsmall">
                        {guestName}
                      </Text>
                    </GuestNameButton>
                  </Tooltip>
                )}
                {canChooseVisibility && (
                  <Tooltip
                    content={
                      isPublic
                        ? t("Visible to anyone with the share link")
                        : t("Visible to team members only")
                    }
                    placement="top"
                  >
                    <VisibilityButton
                      type="button"
                      onClick={handleToggleVisibility}
                      aria-label={t("Comment visibility")}
                      aria-pressed={isPublic}
                      $active={isPublic}
                    >
                      {isPublic ? <GlobeIcon /> : <PadlockIcon />}
                    </VisibilityButton>
                  </Tooltip>
                )}
                {!isShare && (
                  <Tooltip content={t("Upload image")} placement="top">
                    <NudeButton onClick={handleImageUpload}>
                      <ImageIcon color={theme.textTertiary} />
                    </NudeButton>
                  </Tooltip>
                )}
              </HStack>
            </Flex>
          )}
        </Bubble>
      </Flex>
    </m.form>
  );
}

const GuestNameButton = styled(NudeButton)`
  width: auto;
  max-width: 140px;
  padding: 0 6px;
  line-height: 24px;
  ${ellipsis()}
`;

const VisibilityButton = styled(NudeButton)<{ $active: boolean }>`
  color: ${s("textTertiary")};

  ${(props) =>
    props.$active &&
    css`
      color: ${s("accent")};
    `}

  &:hover {
    color: ${(props) => (props.$active ? props.theme.accent : props.theme.text)};
  }
`;

export default observer(CommentForm);
