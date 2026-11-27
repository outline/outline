import { Redirect, Switch } from "react-router-dom";
import Error404 from "~/scenes/Errors/Error404";
import { UpsellScene } from "~/scenes/Settings/components/UpsellScene";
import { createLazyComponent as lazy } from "~/components/LazyLoad";
import Route from "~/components/ProfiledRoute";
import useSettingsConfig from "~/hooks/useSettingsConfig";
import { settingsPath } from "~/utils/routeHelpers";
import { observer } from "mobx-react";

const Application = lazy(() => import("~/scenes/Settings/Application"));
const GroupMembers = lazy(() => import("~/scenes/Settings/GroupMembers"), {
  exportName: "GroupMembersScene",
});
const Template = lazy(() => import("~/scenes/Settings/Template"));
const TemplateNew = lazy(() => import("~/scenes/Settings/TemplateNew"));

function SettingsRoutes() {
  const configs = useSettingsConfig();

  return (
    <Switch>
      {configs.map((config) => {
        const feature =
          config.locked && !config.placeholder ? config.entitlement : undefined;

        // Pages that need an entitlement the team does not have show an upsell.
        if (feature) {
          return (
            <Route
              exact
              key={config.path}
              path={config.path}
              render={() => (
                <UpsellScene
                  title={config.name}
                  icon={<config.icon />}
                  description={config.description}
                  feature={feature}
                />
              )}
            />
          );
        }

        return (
          <Route
            exact
            key={config.path}
            path={config.path}
            component={config.component}
          />
        );
      })}
      {/* Members was renamed to Users, redirect for backwards compatibility */}
      <Redirect
        exact
        from={settingsPath("members")}
        to={settingsPath("users")}
      />
      {/* Features was renamed to AI, redirect for backwards compatibility */}
      <Redirect exact from={settingsPath("features")} to={settingsPath("ai")} />
      <Route
        exact
        path={settingsPath("groups", ":id", "members")}
        component={GroupMembers.Component}
      />
      <Route
        exact
        path={settingsPath("applications", ":id")}
        component={Application.Component}
      />
      <Route
        exact
        path={settingsPath("templates", "new")}
        component={TemplateNew.Component}
      />
      <Route
        exact
        path={settingsPath("templates", ":id")}
        component={Template.Component}
      />
      <Route component={Error404} />
    </Switch>
  );
}

export default observer(SettingsRoutes);
