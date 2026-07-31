import copy from "copy-to-clipboard";
import { observer } from "mobx-react";
import { CopyIcon, OpenIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type Document from "~/models/Document";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import usePolicy from "~/hooks/usePolicy";
import { createAction } from "~/actions";
import { ActiveDocumentSection } from "~/actions/sections";
import { useMenuAction } from "~/hooks/useMenuAction";
import history from "~/utils/history";
import { urlify } from "~/utils/routeHelpers";

type Props = {
  /** The row to show the menu for. */
  document: Document;
  /** Callback to delete the row, which confirms before deleting. */
  onDelete: (document: Document) => void;
};

/**
 * The overflow menu of one database row, offering the operations that make
 * sense from inside a view without opening the row first.
 *
 * A row is an ordinary document, so these delegate to the document itself
 * rather than to anything database-specific.
 */
function DatabaseRowMenu({ document, onDelete }: Props) {
  const { t } = useTranslation();
  const can = usePolicy(document);

  const handleOpen = React.useCallback(() => {
    history.push(document.path);
  }, [document]);

  const handleCopyLink = React.useCallback(() => {
    copy(urlify(document.path));
    toast.success(t("Link copied to clipboard"));
  }, [t, document]);

  const handleDelete = React.useCallback(() => {
    onDelete(document);
  }, [onDelete, document]);

  const actions = React.useMemo(
    () => [
      createAction({
        name: t("Open"),
        section: ActiveDocumentSection,
        icon: <OpenIcon />,
        perform: handleOpen,
      }),
      createAction({
        name: t("Copy link"),
        section: ActiveDocumentSection,
        icon: <CopyIcon />,
        perform: handleCopyLink,
      }),
      createAction({
        name: `${t("Delete")}…`,
        section: ActiveDocumentSection,
        icon: <TrashIcon />,
        dangerous: true,
        visible: can.delete,
        perform: handleDelete,
      }),
    ],
    [t, can.delete, handleOpen, handleCopyLink, handleDelete]
  );
  const rootAction = useMenuAction(actions);

  return (
    <DropdownMenu action={rootAction} align="end" ariaLabel={t("Row options")}>
      <OverflowMenuButton neutral />
    </DropdownMenu>
  );
}

export default observer(DatabaseRowMenu);
