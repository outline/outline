import * as React from "react";
import { Switch, Redirect } from "react-router-dom";
import Route from "~/components/ProfiledRoute";
import useAuthorizedSettingsConfig from "~/hooks/useAuthorizedSettingsConfig";

// 2. A hook that creates the a list actions based on the roots;
// 3. the actions should be mounted in the command bar components;
// 4. check there are actions that render everytime.

export default function SettingsRoutes() {
  const configs = useAuthorizedSettingsConfig();
  const Routes = React.useMemo(
    () =>
      configs.map((config) => (
        <Route
          exact
          key={config.path}
          path={config.path}
          component={config.component}
        />
      )),
    [configs]
  );
  return (
    <Switch>
      {Routes}
      {/* old routes */}
      <Redirect from="/settings/import-export" to="/settings/export" />
      <Redirect from="/settings/people" to="/settings/members" />
    </Switch>
  );
}
