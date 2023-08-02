import { ToolsIcon, TrashIcon, UserIcon } from "outline-icons";
import * as React from "react";
import stores from "~/stores";
import { createAction } from "~/actions";
import { DeveloperSection } from "~/actions/sections";
import env from "~/env";
import { client } from "~/utils/ApiClient";
import Logger from "~/utils/Logger";
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

export const toggleDebugLogging = createAction({
  name: ({ t }) => t("Toggle debug logging"),
  icon: <ToolsIcon />,
  section: DeveloperSection,
  perform: async ({ t }) => {
    Logger.debugLoggingEnabled = !Logger.debugLoggingEnabled;
    stores.toasts.showToast(
      Logger.debugLoggingEnabled
        ? t("Debug logging enabled")
        : t("Debug logging disabled")
    );
  },
});

export const developer = createAction({
  name: ({ t }) => t("Development"),
  keywords: "debug",
  icon: <ToolsIcon />,
  iconInContextMenu: false,
  section: DeveloperSection,
  children: [clearIndexedDB, toggleDebugLogging, createTestUsers],
});

export const rootDeveloperActions = [developer];
