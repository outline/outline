import * as React from "react";
import { RouteComponentProps, Switch } from "react-router-dom";
import DocumentNew from "~/scenes/DocumentNew";
import Error404 from "~/scenes/Errors/Error404";
import Route from "~/components/ProfiledRoute";
import useSettingsConfig from "~/hooks/useSettingsConfig";
import lazy from "~/utils/lazyWithRetry";
import { matchDocumentSlug, settingsPath } from "~/utils/routeHelpers";

const Application = lazy(() => import("~/scenes/Settings/Application"));
const Document = lazy(() => import("~/scenes/Document"));

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
      <Route
        exact
        path={`${settingsPath("templates")}/${matchDocumentSlug}`}
        component={Document}
      />
      <Route
        exact
        path={`${settingsPath("templates")}/new`}
        component={(props: RouteComponentProps) => (
          <DocumentNew {...props} template />
        )}
      />
      <Route component={Error404} />
    </Switch>
  );
}
