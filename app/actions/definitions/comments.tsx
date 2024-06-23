import { CheckmarkIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { toast } from "sonner";
import stores from "~/stores";
import Comment from "~/models/Comment";
import CommentDeleteDialog from "~/components/CommentDeleteDialog";
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
    name: ({ t }) => t("Delete"),
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

export const resolveCommentFactory = ({ comment }: { comment: Comment }) =>
  createAction({
    name: ({ t }) => t("Resolve thread"),
    analyticsName: "Resolve thread",
    section: DocumentSection,
    icon: <CheckmarkIcon />,
    visible: () => stores.policies.abilities(comment.id).resolve,
    perform: async ({ t }) => {
      await comment.resolve();
      toast.success(t("Thread resolved"));
    },
  });
