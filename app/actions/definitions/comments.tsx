import copy from "copy-to-clipboard";
import { CopyIcon, DoneIcon, SmileyIcon, TrashIcon } from "outline-icons";
import { toast } from "sonner";
import type Comment from "~/models/Comment";
import CommentDeleteDialog from "~/components/CommentDeleteDialog";
import ViewReactionsDialog from "~/components/Reactions/ViewReactionsDialog";
import { createAction } from "..";
import { dialogActionFactory } from "./common";
import { ActiveDocumentSection } from "../sections";
import { commentPath, urlify } from "~/utils/routeHelpers";

export const deleteCommentActionFactory = ({
  comment,
  onDelete,
}: {
  comment: Comment;
  onDelete: () => void;
}) =>
  dialogActionFactory({
    analyticsName: "Delete comment",
    section: ActiveDocumentSection,
    name: (t) => `${t("Delete")}…`,
    title: (t) => t("Delete comment"),
    content: () => (
      <CommentDeleteDialog comment={comment} onSubmit={onDelete} />
    ),
    icon: <TrashIcon />,
    keywords: "trash",
    dangerous: true,
    stopEvent: true,
    visible: ({ stores }) => stores.policies.abilities(comment.id).delete,
  });

export const resolveCommentActionFactory = ({
  comment,
  onResolve,
}: {
  comment: Comment;
  onResolve: () => void;
}) =>
  createAction({
    name: ({ t }) => t("Mark as resolved"),
    analyticsName: "Resolve thread",
    section: ActiveDocumentSection,
    icon: <DoneIcon outline />,
    visible: ({ stores }) =>
      stores.policies.abilities(comment.id).resolve &&
      stores.policies.abilities(comment.documentId).update,
    perform: async ({ t }) => {
      await comment.resolve();
      onResolve();
      toast.success(t("Thread resolved"));
    },
  });

export const unresolveCommentActionFactory = ({
  comment,
  onUnresolve,
}: {
  comment: Comment;
  onUnresolve: () => void;
}) =>
  createAction({
    name: ({ t }) => t("Mark as unresolved"),
    analyticsName: "Unresolve thread",
    section: ActiveDocumentSection,
    icon: <DoneIcon outline />,
    visible: ({ stores }) =>
      stores.policies.abilities(comment.id).unresolve &&
      stores.policies.abilities(comment.documentId).update,
    perform: async () => {
      await comment.unresolve();
      onUnresolve();
    },
  });

export const copyCommentLinkActionFactory = ({
  comment,
}: {
  comment: Comment;
}) =>
  createAction({
    name: ({ t }) => t("Copy link"),
    analyticsName: "Copy comment link",
    section: ActiveDocumentSection,
    icon: <CopyIcon />,
    keywords: "clipboard",
    perform: ({ stores, t }) => {
      const document = stores.documents.get(comment.documentId);
      if (!document) {
        return;
      }

      copy(urlify(commentPath(document, comment)));
      toast.message(t("Link copied to clipboard"));
    },
  });

export const viewCommentReactionsActionFactory = ({
  comment,
}: {
  comment: Comment;
}) =>
  dialogActionFactory({
    analyticsName: "View comment reactions",
    section: ActiveDocumentSection,
    name: (t) => t("View reactions"),
    title: (t) => t("Reactions"),
    content: () => <ViewReactionsDialog model={comment} />,
    icon: <SmileyIcon />,
    stopEvent: true,
    visible: ({ stores }) =>
      stores.policies.abilities(comment.id).read &&
      comment.reactions.length > 0,
  });
