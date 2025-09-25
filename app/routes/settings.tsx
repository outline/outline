import { Switch } from "react-router-dom";
import Error404 from "~/scenes/Errors/Error404";
import Route from "~/components/ProfiledRoute";
import useSettingsConfig from "~/hooks/useSettingsConfig";
import lazy from "~/utils/lazyWithRetry";
import { settingsPath } from "~/utils/routeHelpers";

const Application = lazy(() => import("~/scenes/Settings/Application"));

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
      {/* TODO: Refactor these exceptions into config? */}
      <Route
        exact
        path={`${settingsPath("applications")}/:id`}
        component={Application}
      />
      <Route component={Error404} />
    </Switch>
  );
}
