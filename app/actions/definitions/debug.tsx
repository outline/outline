import { ToolsIcon, TrashIcon } from "outline-icons";
import * as React from "react";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'stores' or its corresponding t... Remove this comment to see the full error message
import stores from "stores";
import { createAction } from "actions";
import { DebugSection } from "actions/sections";
import env from "env";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/developer' or its corres... Remove this comment to see the full error message
import { deleteAllDatabases } from "utils/developer";

export const clearIndexedDB = createAction({
  name: ({ t }) => t("Delete IndexedDB cache"),
  icon: <TrashIcon />,
  keywords: "cache clear database",
  section: DebugSection,
  perform: async ({ t }) => {
    await deleteAllDatabases();
    stores.toasts.showToast(t("IndexedDB cache deleted"));
  },
});

export const development = createAction({
  name: ({ t }) => t("Development"),
  keywords: "debug",
  icon: <ToolsIcon />,
  iconInContextMenu: false,
  section: DebugSection,
  visible: ({ event }) =>
    env.ENVIRONMENT === "development" ||
    (event instanceof KeyboardEvent && event.altKey),
  children: [clearIndexedDB],
});

export const rootDebugActions = [development];
