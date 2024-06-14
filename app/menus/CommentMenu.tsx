import copy from "copy-to-clipboard";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState } from "reakit/Menu";
import { toast } from "sonner";
import EventBoundary from "@shared/components/EventBoundary";
import Comment from "~/models/Comment";
import CommentDeleteDialog from "~/components/CommentDeleteDialog";
import ContextMenu from "~/components/ContextMenu";
import MenuItem from "~/components/ContextMenu/MenuItem";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import Separator from "~/components/ContextMenu/Separator";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { commentPath, urlify } from "~/utils/routeHelpers";

type Props = {
  /** The comment to associate with the menu */
  comment: Comment;
  /** CSS class name */
  className?: string;
  /** Callback when the "Edit" is selected in the menu */
  onEdit: () => void;
  /** Callback when the comment has been deleted */
  onDelete: () => void;
};

function CommentMenu({ comment, onEdit, onDelete, className }: Props) {
  const menu = useMenuState({
    modal: true,
  });
  const { documents, dialogs } = useStores();
  const { t } = useTranslation();
  const can = usePolicy(comment);
  const document = documents.get(comment.documentId);

  const handleDelete = React.useCallback(() => {
    dialogs.openModal({
      title: t("Delete comment"),
      content: <CommentDeleteDialog comment={comment} onSubmit={onDelete} />,
    });
  }, [dialogs, comment, onDelete, t]);

  const handleCopyLink = React.useCallback(() => {
    if (document) {
      copy(urlify(commentPath(document, comment)));
      toast.message(t("Link copied"));
    }
  }, [t, document, comment]);

  return (
    <>
      <EventBoundary>
        <OverflowMenuButton
          aria-label={t("Show menu")}
          className={className}
          {...menu}
        />
      </EventBoundary>

      <ContextMenu {...menu} aria-label={t("Comment options")}>
        {can.update && (
          <MenuItem {...menu} onClick={onEdit}>
            {t("Edit")}
          </MenuItem>
        )}
        <MenuItem {...menu} onClick={handleCopyLink}>
          {t("Copy link")}
        </MenuItem>
        {can.delete && (
          <>
            <Separator />
            <MenuItem {...menu} onClick={handleDelete} dangerous>
              {t("Delete")}
            </MenuItem>
          </>
        )}
      </ContextMenu>
    </>
  );
}

export default observer(CommentMenu);
