import { observer } from "mobx-react";
import * as React from "react";
import { Switch, Redirect, RouteComponentProps } from "react-router-dom";
import DocumentNew from "~/scenes/DocumentNew";
import Error404 from "~/scenes/Error404";
import AuthenticatedLayout from "~/components/AuthenticatedLayout";
import CenteredContent from "~/components/CenteredContent";
import PlaceholderDocument from "~/components/PlaceholderDocument";
import Route from "~/components/ProfiledRoute";
import WebsocketProvider from "~/components/WebsocketProvider";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import lazyWithRetry from "~/utils/lazyWithRetry";
import { matchDocumentSlug as slug } from "~/utils/routeHelpers";

const SettingsRoutes = lazyWithRetry(() => import("./settings"));
const Archive = lazyWithRetry(() => import("~/scenes/Archive"));
const Collection = lazyWithRetry(() => import("~/scenes/Collection"));
const Document = lazyWithRetry(() => import("~/scenes/Document"));
const Drafts = lazyWithRetry(() => import("~/scenes/Drafts"));
const Home = lazyWithRetry(() => import("~/scenes/Home"));
const Templates = lazyWithRetry(() => import("~/scenes/Templates"));
const Search = lazyWithRetry(() => import("~/scenes/Search"));
const Trash = lazyWithRetry(() => import("~/scenes/Trash"));

const RedirectDocument = ({
  match,
}: RouteComponentProps<{ documentSlug: string }>) => (
  <Redirect
    to={
      match.params.documentSlug ? `/doc/${match.params.documentSlug}` : "/home"
    }
  />
);

function AuthenticatedRoutes() {
  const team = useCurrentTeam();
  const can = usePolicy(team);

  return (
    <WebsocketProvider>
      <AuthenticatedLayout>
        <React.Suspense
          fallback={
            <CenteredContent>
              <PlaceholderDocument />
            </CenteredContent>
          }
        >
          <Switch>
            {can.createDocument && (
              <Route exact path="/templates" component={Templates} />
            )}
            {can.createDocument && (
              <Route exact path="/templates/:sort" component={Templates} />
            )}
            {can.createDocument && (
              <Route exact path="/drafts" component={Drafts} />
            )}
            {can.createDocument && (
              <Route exact path="/archive" component={Archive} />
            )}
            {can.createDocument && (
              <Route exact path="/trash" component={Trash} />
            )}
            <Redirect from="/dashboard" to="/home" />
            <Route path="/home/:tab" component={Home} />
            <Route path="/home" component={Home} />
            <Redirect exact from="/starred" to="/home" />
            <Redirect exact from="/collections/*" to="/collection/*" />
            <Route exact path="/collection/:id/new" component={DocumentNew} />
            <Route exact path="/collection/:id/:tab" component={Collection} />
            <Route exact path="/collection/:id" component={Collection} />
            <Route exact path="/doc/new" component={DocumentNew} />
            <Route exact path={`/d/${slug}`} component={RedirectDocument} />
            <Route
              exact
              path={`/doc/${slug}/history/:revisionId?`}
              component={Document}
            />
            <Route exact path={`/doc/${slug}/insights`} component={Document} />
            <Route exact path={`/doc/${slug}/edit`} component={Document} />
            <Route path={`/doc/${slug}`} component={Document} />
            <Route exact path="/search" component={Search} />
            <Route exact path="/search/:term" component={Search} />
            <Route path="/404" component={Error404} />
            <SettingsRoutes />
            <Route component={Error404} />
          </Switch>
        </React.Suspense>
      </AuthenticatedLayout>
    </WebsocketProvider>
  );
}

export default observer(AuthenticatedRoutes);
