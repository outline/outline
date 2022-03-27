import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState } from "reakit/Menu";
import Comment from "~/models/Comment";
import ContextMenu from "~/components/ContextMenu";
import MenuItem from "~/components/ContextMenu/MenuItem";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";

type Props = {
  comment: Comment;
  className?: string;
  onEdit: () => void;
};

function CommentMenu({ comment, onEdit, className }: Props) {
  const menu = useMenuState({
    modal: true,
  });
  const { comments } = useStores();
  const { showToast } = useToasts();
  const { t } = useTranslation();
  const can = usePolicy(comment.id);

  const handleDelete = React.useCallback(() => {
    // TODO: Confirm
    comment.delete();
  }, []);

  // TODO: Remove once copy link action is added
  if (!can.update) {
    return null;
  }

  return (
    <>
      <OverflowMenuButton
        aria-label={t("Show menu")}
        className={className}
        {...menu}
      />
      <ContextMenu {...menu} aria-label={t("Comment options")}>
        {can.update && (
          <MenuItem {...menu} onClick={onEdit}>
            {t("Edit")}
          </MenuItem>
        )}
        {can.delete && (
          <MenuItem {...menu} onClick={handleDelete} dangerous>
            {t("Delete")}
          </MenuItem>
        )}
      </ContextMenu>
    </>
  );
}

export default observer(CommentMenu);
