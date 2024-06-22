import { TrashIcon } from "outline-icons";
import * as React from "react";
import stores from "~/stores";
import Comment from "~/models/Comment";
import CommentDeleteDialog from "~/components/CommentDeleteDialog";
import { createAction } from "..";
import { SettingsSection } from "../sections";

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
    section: SettingsSection,
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
