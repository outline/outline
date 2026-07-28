import { observer } from "mobx-react";
import { DatabaseIcon, EditIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { errToString } from "@shared/utils/error";
import type Database from "~/models/Database";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import DatabaseSchemaEditor from "~/components/Database/DatabaseSchemaEditor";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { createAction } from "~/actions";
import { ActiveCollectionSection } from "~/actions/sections";
import { useMenuAction } from "~/hooks/useMenuAction";
import history from "~/utils/history";

type Props = {
  /** The database to show the menu for. */
  database: Database;
};

/**
 * The overflow menu of one database, offering the same operations as the
 * command palette actions on the database page: editing its property schema,
 * renaming and deleting it.
 */
function DatabaseMenu({ database }: Props) {
  const { t } = useTranslation();
  const { dialogs } = useStores();
  const can = usePolicy(database);

  const handleEditSchema = React.useCallback(() => {
    dialogs.openModal({
      title: t("Database properties"),
      content: (
        <DatabaseSchemaEditor
          databaseId={database.id}
          onSubmit={dialogs.closeAllModals}
        />
      ),
    });
  }, [t, dialogs, database.id]);

  const handleRename = React.useCallback(async () => {
    const name = window.prompt(t("Name"), database.name);
    if (!name?.trim()) {
      return;
    }
    try {
      await database.save({ name: name.trim() });
    } catch (error) {
      toast.error(errToString(error));
    }
  }, [t, database]);

  const handleDelete = React.useCallback(() => {
    dialogs.openModal({
      title: t("Delete database"),
      content: (
        <ConfirmationDialog
          onSubmit={async () => {
            const collection = database.collection;
            await database.delete();
            history.push(collection?.path ?? "/home");
          }}
          savingText={`${t("Deleting")}…`}
          danger
        >
          {t(
            "Are you sure? Deleting the {{ databaseName }} database removes its property schema and views. Its rows remain as documents in the collection.",
            { databaseName: database.name }
          )}
        </ConfirmationDialog>
      ),
    });
  }, [t, dialogs, database]);

  const actions = React.useMemo(
    () => [
      createAction({
        name: `${t("Properties")}…`,
        section: ActiveCollectionSection,
        icon: <DatabaseIcon />,
        visible: can.update,
        perform: handleEditSchema,
      }),
      createAction({
        name: t("Rename"),
        section: ActiveCollectionSection,
        icon: <EditIcon />,
        visible: can.update,
        perform: handleRename,
      }),
      createAction({
        name: `${t("Delete")}…`,
        section: ActiveCollectionSection,
        icon: <TrashIcon />,
        dangerous: true,
        visible: can.delete,
        perform: handleDelete,
      }),
    ],
    [t, can.update, can.delete, handleEditSchema, handleRename, handleDelete]
  );
  const rootAction = useMenuAction(actions);

  if (!can.update && !can.delete) {
    return null;
  }

  return (
    <DropdownMenu
      action={rootAction}
      align="end"
      ariaLabel={t("Database options")}
    >
      <OverflowMenuButton />
    </DropdownMenu>
  );
}

export default observer(DatabaseMenu);
