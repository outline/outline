import * as React from "react";
import { Switch, Redirect } from "react-router-dom";
import Error404 from "~/scenes/Error404";
import Route from "~/components/ProfiledRoute";
import useSettingsConfig from "~/hooks/useSettingsConfig";

export default function SettingsRoutes() {
  const configs = useSettingsConfig();

  return (
    <Switch>
      {configs.map((config) => (
        <Route
          exact
          key={config.path}
          path={config.path}
          component={config.component}
        />
      ))}
      {/* old routes */}
      <Redirect from="/settings/import-export" to="/settings/export" />
      <Redirect from="/settings/people" to="/settings/members" />
      <Redirect from="/settings/profile" to="/settings" />
      <Route component={Error404} />
    </Switch>
  );
}
