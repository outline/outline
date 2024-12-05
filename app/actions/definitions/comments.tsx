import { DoneIcon, SmileyIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { toast } from "sonner";
import stores from "~/stores";
import Comment from "~/models/Comment";
import CommentDeleteDialog from "~/components/CommentDeleteDialog";
import ViewReactionsDialog from "~/components/Reactions/ViewReactionsDialog";
import history from "~/utils/history";
import { createAction } from "..";
import { DocumentSection } from "../sections";

export const deleteCommentFactory = ({
  comment,
  onDelete,
}: {
  comment: Comment;
  onDelete: () => void;
}) =>
  createAction({
    name: ({ t }) => `${t("Delete")}…`,
    analyticsName: "Delete comment",
    section: DocumentSection,
    icon: <TrashIcon />,
    keywords: "trash",
    dangerous: true,
    visible: () => stores.policies.abilities(comment.id).delete,
    perform: ({ t, event }) => {
      event?.preventDefault();
      event?.stopPropagation();

      stores.dialogs.openModal({
        title: t("Delete comment"),
        content: <CommentDeleteDialog comment={comment} onSubmit={onDelete} />,
      });
    },
  });

export const resolveCommentFactory = ({
  comment,
  onResolve,
}: {
  comment: Comment;
  onResolve: () => void;
}) =>
  createAction({
    name: ({ t }) => t("Mark as resolved"),
    analyticsName: "Resolve thread",
    section: DocumentSection,
    icon: <DoneIcon outline />,
    visible: () =>
      stores.policies.abilities(comment.id).resolve &&
      stores.policies.abilities(comment.documentId).update,
    perform: async ({ t }) => {
      await comment.resolve();

      const locationState = history.location.state as Record<string, unknown>;
      history.replace({
        ...history.location,
        state: {
          sidebarContext: locationState["sidebarContext"],
          commentId: undefined,
        },
      });

      onResolve();
      toast.success(t("Thread resolved"));
    },
  });

export const unresolveCommentFactory = ({
  comment,
  onUnresolve,
}: {
  comment: Comment;
  onUnresolve: () => void;
}) =>
  createAction({
    name: ({ t }) => t("Mark as unresolved"),
    analyticsName: "Unresolve thread",
    section: DocumentSection,
    icon: <DoneIcon outline />,
    visible: () =>
      stores.policies.abilities(comment.id).unresolve &&
      stores.policies.abilities(comment.documentId).update,
    perform: async () => {
      await comment.unresolve();

      const locationState = history.location.state as Record<string, unknown>;
      history.replace({
        ...history.location,
        state: {
          sidebarContext: locationState["sidebarContext"],
          commentId: undefined,
        },
      });

      onUnresolve();
    },
  });

export const viewCommentReactionsFactory = ({
  comment,
}: {
  comment: Comment;
}) =>
  createAction({
    name: ({ t }) => `${t("View reactions")}`,
    analyticsName: "View comment reactions",
    section: DocumentSection,
    icon: <SmileyIcon />,
    visible: () =>
      stores.policies.abilities(comment.id).read &&
      comment.reactions.length > 0,
    perform: ({ t, event }) => {
      event?.preventDefault();
      event?.stopPropagation();

      stores.dialogs.openModal({
        title: t("Reactions"),
        content: <ViewReactionsDialog model={comment} />,
      });
    },
  });
