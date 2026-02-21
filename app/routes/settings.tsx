import { Switch } from "react-router-dom";
import Error404 from "~/scenes/Errors/Error404";
import Route from "~/components/ProfiledRoute";
import useSettingsConfig from "~/hooks/useSettingsConfig";
import lazy from "~/utils/lazyWithRetry";
import { settingsPath } from "~/utils/routeHelpers";
import { observer } from "mobx-react";

const Application = lazy(() => import("~/scenes/Settings/Application"));
const Template = lazy(() => import("~/scenes/Settings/Template"));
const TemplateNew = lazy(() => import("~/scenes/Settings/TemplateNew"));

function SettingsRoutes() {
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
        path={settingsPath("applications", ":id")}
        component={Application}
      />
      <Route
        exact
        path={settingsPath("templates", "new")}
        component={TemplateNew}
      />
      <Route
        exact
        path={settingsPath("templates", ":id")}
        component={Template}
      />
      <Route component={Error404} />
    </Switch>
  );
}

export default observer(SettingsRoutes);
