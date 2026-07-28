import { DatabaseIcon, EditIcon, TrashIcon } from "outline-icons";
import { toast } from "sonner";
import { errToString } from "@shared/utils/error";
import Database from "~/models/Database";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import DatabaseSchemaEditor from "~/components/Database/DatabaseSchemaEditor";
import { createAction } from "~/actions";
import { ActiveCollectionSection } from "~/actions/sections";
import history from "~/utils/history";

export const editDatabaseSchema = createAction({
  name: ({ t, isMenu }) =>
    isMenu ? `${t("Properties")}…` : t("Database properties"),
  analyticsName: "Edit database properties",
  section: ActiveCollectionSection,
  icon: <DatabaseIcon />,
  visible: ({ getActivePolicies }) =>
    getActivePolicies(Database).some((policy) => policy.abilities.update),
  perform: ({ t, getActiveModel, stores }) => {
    const database = getActiveModel(Database);
    if (!database) {
      return;
    }

    stores.dialogs.openModal({
      title: t("Database properties"),
      content: (
        <DatabaseSchemaEditor
          databaseId={database.id}
          onSubmit={stores.dialogs.closeAllModals}
        />
      ),
    });
  },
});

export const renameDatabase = createAction({
  name: ({ t }) => t("Rename"),
  analyticsName: "Rename database",
  section: ActiveCollectionSection,
  icon: <EditIcon />,
  visible: ({ getActivePolicies }) =>
    getActivePolicies(Database).some((policy) => policy.abilities.update),
  perform: async ({ t, getActiveModel }) => {
    const database = getActiveModel(Database);
    if (!database) {
      return;
    }

    const name = window.prompt(t("Name"), database.name);
    if (!name?.trim()) {
      return;
    }

    try {
      await database.save({ name: name.trim() });
    } catch (error) {
      toast.error(errToString(error));
    }
  },
});

export const deleteDatabase = createAction({
  name: ({ t, isMenu }) => (isMenu ? `${t("Delete")}…` : t("Delete database")),
  analyticsName: "Delete database",
  section: ActiveCollectionSection,
  icon: <TrashIcon />,
  dangerous: true,
  visible: ({ getActivePolicies }) =>
    getActivePolicies(Database).some((policy) => policy.abilities.delete),
  perform: ({ t, getActiveModel, stores }) => {
    const database = getActiveModel(Database);
    if (!database) {
      return;
    }

    stores.dialogs.openModal({
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
  },
});

export const rootDatabaseActions = [
  editDatabaseSchema,
  renameDatabase,
  deleteDatabase,
];
