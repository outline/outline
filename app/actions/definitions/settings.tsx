import { SunIcon, MoonIcon, BrowserIcon } from "outline-icons";
import { Theme } from "~/stores/UiStore";
import { createAction, createActionWithChildren } from "~/actions";
import { SettingsSection } from "~/actions/sections";

export const changeToDarkTheme = createAction({
  name: ({ t }) => t("Dark"),
  analyticsName: "Change to dark theme",
  icon: <MoonIcon />,
  iconInContextMenu: false,
  keywords: "theme dark night",
  section: SettingsSection,
  selected: ({ stores }) => stores.ui.theme === "dark",
  perform: ({ stores }) => stores.ui.setTheme(Theme.Dark),
});

export const changeToLightTheme = createAction({
  name: ({ t }) => t("Light"),
  analyticsName: "Change to light theme",
  icon: <SunIcon />,
  iconInContextMenu: false,
  keywords: "theme light day",
  section: SettingsSection,
  selected: ({ stores }) => stores.ui.theme === "light",
  perform: ({ stores }) => stores.ui.setTheme(Theme.Light),
});

export const changeToSystemTheme = createAction({
  name: ({ t }) => t("System"),
  analyticsName: "Change to system theme",
  icon: <BrowserIcon />,
  iconInContextMenu: false,
  keywords: "theme system default",
  section: SettingsSection,
  selected: ({ stores }) => stores.ui.theme === "system",
  perform: ({ stores }) => stores.ui.setTheme(Theme.System),
});

export const changeTheme = createActionWithChildren({
  name: ({ t, isMenu }) => (isMenu ? t("Appearance") : t("Change theme")),
  analyticsName: "Change theme",
  placeholder: ({ t }) => t("Change theme to"),
  icon: ({ stores }) =>
    stores.ui.resolvedTheme === "light" ? <SunIcon /> : <MoonIcon />,
  keywords: "appearance display",
  section: SettingsSection,
  children: [changeToLightTheme, changeToDarkTheme, changeToSystemTheme],
});

export const rootSettingsActions = [changeTheme];
