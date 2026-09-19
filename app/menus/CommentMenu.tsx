import { observer } from "mobx-react";
import { EditIcon } from "outline-icons";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type Comment from "~/models/Comment";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import {
  copyCommentLinkActionFactory,
  deleteCommentActionFactory,
  resolveCommentActionFactory,
  unresolveCommentActionFactory,
  viewCommentReactionsActionFactory,
} from "~/actions/definitions/comments";
import usePolicy from "~/hooks/usePolicy";
import { ActionSeparator, createAction } from "~/actions";
import { ActiveDocumentSection } from "~/actions/sections";
import { useMenuAction } from "~/hooks/useMenuAction";

type Props = {
  /** The comment to associate with the menu */
  comment: Comment;
  /** CSS class name */
  className?: string;
  /** Callback when the "Edit" is selected in the menu */
  onEdit: () => void;
  /** Callback when the comment has been deleted */
  onDelete: () => void;
  /** Callback when the comment has been updated */
  onUpdate: (attrs: { resolved: boolean }) => void;
};

function CommentMenu({
  comment,
  onEdit,
  onDelete,
  onUpdate,
  className,
}: Props) {
  const { t } = useTranslation();
  const can = usePolicy(comment);

  const actions = useMemo(
    () => [
      createAction({
        name: `${t("Edit")}…`,
        icon: <EditIcon />,
        section: ActiveDocumentSection,
        visible: can.update && !comment.isResolved,
        perform: onEdit,
      }),
      resolveCommentActionFactory({
        comment,
        onResolve: () => onUpdate({ resolved: true }),
      }),
      unresolveCommentActionFactory({
        comment,
        onUnresolve: () => onUpdate({ resolved: false }),
      }),
      viewCommentReactionsActionFactory({
        comment,
      }),
      copyCommentLinkActionFactory({ comment }),
      ActionSeparator,
      deleteCommentActionFactory({ comment, onDelete }),
    ],
    [t, comment, can.update, onEdit, onUpdate, onDelete]
  );

  const rootAction = useMenuAction(actions);

  return (
    <DropdownMenu
      action={rootAction}
      align="end"
      ariaLabel={t("Comment options")}
      modal={false}
    >
      <OverflowMenuButton className={className} />
    </DropdownMenu>
  );
}

export default observer(CommentMenu);
