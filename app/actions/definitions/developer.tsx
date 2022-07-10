import { ToolsIcon, TrashIcon, UserIcon } from "outline-icons";
import * as React from "react";
import stores from "~/stores";
import { createAction } from "~/actions";
import { DeveloperSection } from "~/actions/sections";
import env from "~/env";
import { client } from "~/utils/ApiClient";
import { deleteAllDatabases } from "~/utils/developer";

export const clearIndexedDB = createAction({
  name: ({ t }) => t("Delete IndexedDB cache"),
  icon: <TrashIcon />,
  keywords: "cache clear database",
  section: DeveloperSection,
  perform: async ({ t }) => {
    await deleteAllDatabases();
    stores.toasts.showToast(t("IndexedDB cache deleted"));
  },
});

export const createTestUsers = createAction({
  name: "Create test users",
  icon: <UserIcon />,
  section: DeveloperSection,
  visible: () => env.ENVIRONMENT === "development",
  perform: async () => {
    const count = 10;

    try {
      await client.post("/developer.create_test_users", { count });
      stores.toasts.showToast(`${count} test users created`);
    } catch (err) {
      stores.toasts.showToast(err.message, { type: "error" });
    }
  },
});

export const developer = createAction({
  name: ({ t }) => t("Developer"),
  keywords: "debug",
  icon: <ToolsIcon />,
  iconInContextMenu: false,
  section: DeveloperSection,
  visible: ({ event }) =>
    env.ENVIRONMENT === "development" ||
    (event instanceof KeyboardEvent && event.altKey),
  children: [clearIndexedDB, createTestUsers],
});

export const rootDeveloperActions = [developer];
