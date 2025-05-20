import { SettingsIcon } from "outline-icons";
import { useMemo } from "react";
import { createAction } from "~/actions";
import { NavigationSection } from "~/actions/sections";
import useSettingsConfig from "~/hooks/useSettingsConfig";
import history from "~/utils/history";

const useSettingsAction = () => {
  const config = useSettingsConfig();
  const actions = useMemo(
    () =>
      config.map((item) => {
        const Icon = item.icon;
        return {
          id: item.path,
          name: item.name,
          icon: <Icon />,
          section: NavigationSection,
          perform: () => history.push(item.path),
        };
      }),
    [config]
  );

  const navigateToSettings = useMemo(
    () =>
      createAction({
        id: "settings",
        name: ({ t }) => t("Settings"),
        section: NavigationSection,
        shortcut: ["g", "s"],
        icon: <SettingsIcon />,
        children: () => actions,
      }),
    [actions]
  );

  return navigateToSettings;
};

export default useSettingsAction;
