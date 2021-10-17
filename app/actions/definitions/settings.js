// @flow
import { SunIcon, MoonIcon, ToolsIcon } from "outline-icons";
import * as React from "react";
import stores from "stores";
import { createAction } from "actions";

export const changeToDarkTheme = createAction({
  name: ({ t }) => t("Dark"),
  icon: <MoonIcon />,
  iconInContextMenu: false,
  keywords: "theme dark night",
  section: ({ t }) => t("Settings"),
  selected: () => stores.ui.theme === "dark",
  perform: () => stores.ui.setTheme("dark"),
});

export const changeToLightTheme = createAction({
  name: ({ t }) => t("Light"),
  icon: <SunIcon />,
  iconInContextMenu: false,
  keywords: "theme light day",
  section: ({ t }) => t("Settings"),
  selected: () => stores.ui.theme === "light",
  perform: () => stores.ui.setTheme("light"),
});

export const changeToSystemTheme = createAction({
  name: ({ t }) => t("System"),
  icon: <ToolsIcon />,
  iconInContextMenu: false,
  keywords: "theme system default",
  section: ({ t }) => t("Settings"),
  selected: () => stores.ui.theme === "system",
  perform: () => stores.ui.setTheme("system"),
});

export const changeTheme = createAction({
  name: ({ t }) => t("Appearance"),
  icon: () =>
    stores.ui.resolvedTheme === "light" ? <SunIcon /> : <MoonIcon />,
  keywords: "theme appearance display",
  section: ({ t }) => t("Settings"),
  children: [changeToLightTheme, changeToDarkTheme, changeToSystemTheme],
});

export const rootSettingsActions = [changeTheme];
