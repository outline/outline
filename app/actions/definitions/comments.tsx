import { DoneIcon, SmileyIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { toast } from "sonner";
import stores from "~/stores";
import Comment from "~/models/Comment";
import CommentDeleteDialog from "~/components/CommentDeleteDialog";
import ViewReactionsDialog from "~/components/Reactions/components/ViewReactionsDialog";
import { ReactionData } from "~/types";
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

      history.replace({
        ...history.location,
        state: null,
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

      history.replace({
        ...history.location,
        state: null,
      });

      onUnresolve();
    },
  });

export const viewCommentReactionsFactory = ({
  comment,
  fetchReactionData,
}: {
  comment: Comment;
  fetchReactionData: () => Promise<ReactionData[]>;
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
        content: <ViewReactionsDialog fetchReactionData={fetchReactionData} />,
      });
    },
  });
