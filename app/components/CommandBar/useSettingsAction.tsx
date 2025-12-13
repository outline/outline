import { SettingsIcon } from "outline-icons";
import { useMemo } from "react";
import { createActionWithChildren, createInternalLinkAction } from "~/actions";
import { NavigationSection } from "~/actions/sections";
import useSettingsConfig from "~/hooks/useSettingsConfig";

const useSettingsAction = () => {
  const config = useSettingsConfig();
  const actions = useMemo(
    () =>
      config.map((item) => {
        const Icon = item.icon;
        return createInternalLinkAction({
          id: item.path,
          name: item.name,
          icon: <Icon />,
          section: NavigationSection,
          to: item.path,
        });
      }),
    [config]
  );

  const navigateToSettings = useMemo(
    () =>
      createActionWithChildren({
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
