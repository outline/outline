import { ToolsIcon, TrashIcon, UserIcon } from "outline-icons";
import * as React from "react";
import { toast } from "sonner";
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
    toast.message(t("IndexedDB cache deleted"));
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
      toast.message(`${count} test users created`);
    } catch (err) {
      toast.error(err.message);
    }
  },
});

export const createToast = createAction({
  name: "Create toast",
  section: DeveloperSection,
  visible: () => env.ENVIRONMENT === "development",
  perform: async () => {
    toast.message("Hello world", {
      duration: 30000,
    });
  },
});

export const toggleDebugLogging = createAction({
  name: ({ t }) => t("Toggle debug logging"),
  icon: <ToolsIcon />,
  section: DeveloperSection,
  perform: async ({ t }) => {
    Logger.debugLoggingEnabled = !Logger.debugLoggingEnabled;
    toast.message(
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
  children: [clearIndexedDB, toggleDebugLogging, createToast, createTestUsers],
});

export const rootDeveloperActions = [developer];
