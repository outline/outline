import { observer } from "mobx-react";
import type { RouteObject } from "react-router-dom";
import { useRoutes } from "react-router-dom";
import Error404 from "~/scenes/Errors/Error404";
import { createLazyComponent as lazy } from "~/components/LazyLoad";
import useSettingsConfig from "~/hooks/useSettingsConfig";
import { settingsPath } from "~/utils/routeHelpers";

const Application = lazy(() => import("~/scenes/Settings/Application"));
const GroupMembers = lazy(() => import("~/scenes/Settings/GroupMembers"), {
  exportName: "GroupMembersScene",
});
const Template = lazy(() => import("~/scenes/Settings/Template"));
const TemplateNew = lazy(() => import("~/scenes/Settings/TemplateNew"));

/** Strips the `/settings` prefix so a path is relative to the settings outlet. */
const rel = (path: string) =>
  path.replace(settingsPath(), "").replace(/^\//, "");

/**
 * Builds a route object from a settings path and element, mapping the empty
 * (root settings) path to an index route.
 */
function route(path: string, element: JSX.Element): RouteObject {
  const relative = rel(path);
  return relative ? { path: relative, element } : { index: true, element };
}

function SettingsRoutes() {
  const configs = useSettingsConfig();

  const routes: RouteObject[] = [
    ...configs.map((config) => {
      const Component = config.component;
      return route(config.path, <Component />);
    }),
    // TODO: Refactor these exceptions into config?
    route(settingsPath("groups", ":id", "members"), <GroupMembers.Component />),
    route(settingsPath("applications", ":id"), <Application.Component />),
    route(settingsPath("templates", "new"), <TemplateNew.Component />),
    route(settingsPath("templates", ":id"), <Template.Component />),
    { path: "*", element: <Error404 /> },
  ];

  return useRoutes(routes);
}

export default observer(SettingsRoutes);
