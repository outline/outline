// @flow
import { TrashIcon } from "outline-icons";
import * as React from "react";
import { v4 as uuidv4 } from "uuid";
import stores from "stores";
import env from "env";
import { type Action } from "types";
import { deleteAllDatabases } from "utils/developer";

export const clearIndexedDB: Action = {
  id: uuidv4(),
  name: ({ t }) => t("Delete IndexedDB cache"),
  icon: <TrashIcon />,
  keywords: "cache clear database",
  section: ({ t }) => t("Debug"),
  perform: async ({ t }) => {
    await deleteAllDatabases();
    stores.toasts.showToast(t("IndexedDB cache deleted"));
  },
};

export const development: Action = {
  id: uuidv4(),
  name: ({ t }) => t("Development"),
  keywords: "debug",
  section: ({ t }) => t("Debug"),
  visible: ({ event }) =>
    env.ENVIRONMENT === "development" ||
    (event instanceof KeyboardEvent && event.altKey),
  children: [clearIndexedDB],
};
