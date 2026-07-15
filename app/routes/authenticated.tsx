import { observer } from "mobx-react";
import { Suspense } from "react";
import type { RouteComponentProps } from "react-router-dom";
import { Switch, Redirect } from "react-router-dom";
import DocumentNew from "~/scenes/DocumentNew";
import Error404 from "~/scenes/Errors/Error404";
import AuthenticatedLayout from "~/components/AuthenticatedLayout";
import CenteredContent from "~/components/CenteredContent";
import PlaceholderDocument from "~/components/PlaceholderDocument";
import Route from "~/components/ProfiledRoute";
import WebsocketProvider from "~/components/WebsocketProvider";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useQueryNotices from "~/hooks/useQueryNotices";
import {
  homePath,
  settingsPath,
  matchDocumentSlug as documentSlug,
  matchCollectionSlug as collectionSlug,
  matchDocumentEdit,
  matchDocumentHistory,
} from "~/utils/routeHelpers";
import env from "~/env";
import { routeMap } from "./map";

const SettingsRoutes = routeMap.settings.Component;

const RedirectDocument = ({
  match,
}: RouteComponentProps<{ documentSlug: string }>) => (
  <Redirect
    to={
      match.params.documentSlug
        ? `/doc/${match.params.documentSlug}`
        : homePath()
    }
  />
);

/**
 * The authenticated routes are all the routes of the application that require
 * the user to be logged in.
 */
function AuthenticatedRoutes() {
  useQueryNotices();
  const team = useCurrentTeam();
  const can = usePolicy(team);

  return (
    <WebsocketProvider>
      <AuthenticatedLayout>
        <Suspense
          fallback={
            <CenteredContent>
              <PlaceholderDocument />
            </CenteredContent>
          }
        >
          <Switch>
            {can.createDocument && (
              <Route
                exact
                path={routeMap.drafts.paths}
                component={routeMap.drafts.Component}
              />
            )}
            {can.createDocument && (
              <Route
                exact
                path={routeMap.archive.paths}
                component={routeMap.archive.Component}
              />
            )}
            {can.createDocument && (
              <Route
                exact
                path={routeMap.trash.paths}
                component={routeMap.trash.Component}
              />
            )}
            <Route
              path={routeMap.home.paths}
              component={routeMap.home.Component}
            />
            <Redirect from="/dashboard" to={homePath()} />
            <Redirect exact from="/starred" to={homePath()} />
            <Redirect exact from="/templates" to={settingsPath("templates")} />
            <Redirect exact from="/collections/*" to="/collection/*" />
            <Route
              exact
              path={`/collection/${collectionSlug}/new`}
              component={DocumentNew}
            />
            <Route
              exact
              path={routeMap.collection.paths}
              component={routeMap.collection.Component}
            />
            <Route exact path="/doc/new" component={DocumentNew} />
            <Route
              exact
              path={`/d/${documentSlug}`}
              component={RedirectDocument}
            />
            <Route
              exact
              path={matchDocumentHistory}
              component={routeMap.document.Component}
            />

            <Route
              exact
              path={matchDocumentEdit}
              component={routeMap.document.Component}
            />
            <Route
              path={routeMap.document.paths}
              component={routeMap.document.Component}
            />
            <Route
              exact
              path={routeMap.search.paths}
              component={routeMap.search.Component}
            />
            {env.isDevelopment && (
              <Route
                exact
                path={routeMap.debug.paths}
                component={routeMap.debug.Component}
              />
            )}
            {env.isDevelopment && (
              <Route
                exact
                path={routeMap.changesets.paths}
                component={routeMap.changesets.Component}
              />
            )}
            <Route exact path="/404" component={Error404} />
            <SettingsRoutes />
            <Route component={Error404} />
          </Switch>
        </Suspense>
      </AuthenticatedLayout>
    </WebsocketProvider>
  );
}

export default observer(AuthenticatedRoutes);
