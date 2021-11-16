import { SunIcon, MoonIcon, BrowserIcon } from "outline-icons";
import * as React from "react";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'stores' or its corresponding t... Remove this comment to see the full error message
import stores from "stores";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'actions' or its corresponding ... Remove this comment to see the full error message
import { createAction } from "actions";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'actions/sections' or its corre... Remove this comment to see the full error message
import { SettingsSection } from "actions/sections";

export const changeToDarkTheme = createAction({
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  name: ({ t }) => t("Dark"),
  icon: <MoonIcon />,
  iconInContextMenu: false,
  keywords: "theme dark night",
  section: SettingsSection,
  selected: () => stores.ui.theme === "dark",
  perform: () => stores.ui.setTheme("dark"),
});

export const changeToLightTheme = createAction({
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  name: ({ t }) => t("Light"),
  icon: <SunIcon />,
  iconInContextMenu: false,
  keywords: "theme light day",
  section: SettingsSection,
  selected: () => stores.ui.theme === "light",
  perform: () => stores.ui.setTheme("light"),
});

export const changeToSystemTheme = createAction({
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  name: ({ t }) => t("System"),
  icon: <BrowserIcon />,
  iconInContextMenu: false,
  keywords: "theme system default",
  section: SettingsSection,
  selected: () => stores.ui.theme === "system",
  perform: () => stores.ui.setTheme("system"),
});

export const changeTheme = createAction({
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  name: ({ t }) => t("Change theme"),
  // @ts-expect-error ts-migrate(7031) FIXME: Binding element 't' implicitly has an 'any' type.
  placeholder: ({ t }) => t("Change theme to"),
  icon: () =>
    stores.ui.resolvedTheme === "light" ? <SunIcon /> : <MoonIcon />,
  keywords: "appearance display",
  section: SettingsSection,
  children: [changeToLightTheme, changeToDarkTheme, changeToSystemTheme],
});

export const rootSettingsActions = [changeTheme];
