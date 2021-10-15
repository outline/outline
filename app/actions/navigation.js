// @flow
import { SettingsIcon, KeyboardIcon } from "outline-icons";
import * as React from "react";
import { v4 as uuidv4 } from "uuid";
import { settings } from "shared/utils/routeHelpers";
import KeyboardShortcuts from "scenes/KeyboardShortcuts";
import stores from "../stores";
import { type Action } from "../types";
import history from "../utils/history";

export const navigateToSettings: Action = {
  id: uuidv4(),
  name: ({ t }) => t("Settings"),
  section: ({ t }) => t("Navigation"),
  shortcut: ["g", "s"],
  iconInContextMenu: false,
  icon: <SettingsIcon color="currentColor" />,
  perform: () => history.push(settings()),
};

export const openKeyboardShortcuts: Action = {
  id: uuidv4(),
  name: ({ t }) => t("Keyboard shortcuts"),
  section: ({ t }) => t("Navigation"),
  shortcut: ["?"],
  iconInContextMenu: false,
  icon: <KeyboardIcon color="currentColor" />,
  perform: ({ t }) => {
    stores.dialogs.openGuide({
      title: t("Keyboard shortcuts"),
      content: <KeyboardShortcuts />,
    });
  },
};
