import * as React from "react";
import { createAction } from "~/actions";
import history from "~/utils/history";
import useAuthorizedSettingsConfig from "./useAuthorizedSettingsConfig";

const useSettingsActions = () => {
  const config = useAuthorizedSettingsConfig();
  const actions = React.useMemo(() => {
    return config.map((item) => {
      const Icon = item.icon;
      return createAction({
        name: item.name,
        icon: <Icon color="currentColor" />,
        section: item.group,
        perform: () => history.push(item.path),
      });
    });
  }, [config]);

  return actions;
};

export default useSettingsActions;
