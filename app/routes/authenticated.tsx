import * as React from "react";
import { Switch, Redirect, RouteComponentProps } from "react-router-dom";
import Archive from "~/scenes/Archive";
import DocumentNew from "~/scenes/DocumentNew";
import Drafts from "~/scenes/Drafts";
import Error404 from "~/scenes/Error404";
import Templates from "~/scenes/Templates";
import Trash from "~/scenes/Trash";
import Layout from "~/components/AuthenticatedLayout";
import CenteredContent from "~/components/CenteredContent";
import PlaceholderDocument from "~/components/PlaceholderDocument";
import Route from "~/components/ProfiledRoute";
import SocketProvider from "~/components/SocketProvider";
import { matchDocumentSlug as slug } from "~/utils/routeHelpers";

const SettingsRoutes = React.lazy(
  () =>
    import(
      /* webpackChunkName: "settings" */
      "./settings"
    )
);
const Document = React.lazy(
  () =>
    import(
      /* webpackChunkName: "document" */
      "~/scenes/Document"
    )
);
const Collection = React.lazy(
  () =>
    import(
      /* webpackChunkName: "collection" */
      "~/scenes/Collection"
    )
);
const Home = React.lazy(
  () =>
    import(
      /* webpackChunkName: "home" */
      "~/scenes/Home"
    )
);
const Search = React.lazy(
  () =>
    import(
      /* webpackChunkName: "search" */
      "~/scenes/Search"
    )
);

const RedirectDocument = ({
  match,
}: RouteComponentProps<{ documentSlug: string }>) => (
  <Redirect
    to={
      match.params.documentSlug ? `/doc/${match.params.documentSlug}` : "/home"
    }
  />
);

export default function AuthenticatedRoutes() {
  return (
    <SocketProvider>
      <Layout>
        <React.Suspense
          fallback={
            <CenteredContent>
              <PlaceholderDocument />
            </CenteredContent>
          }
        >
          <Switch>
            <Redirect from="/dashboard" to="/home" />
            <Route path="/home/:tab" component={Home} />
            <Route path="/home" component={Home} />
            <Route exact path="/templates" component={Templates} />
            <Route exact path="/templates/:sort" component={Templates} />
            <Route exact path="/drafts" component={Drafts} />
            <Route exact path="/archive" component={Archive} />
            <Route exact path="/trash" component={Trash} />
            <Redirect exact from="/starred" to="/home" />
            <Redirect exact from="/collections/*" to="/collection/*" />
            <Route exact path="/collection/:id/new" component={DocumentNew} />
            <Route exact path="/collection/:id/:tab" component={Collection} />
            <Route exact path="/collection/:id" component={Collection} />
            <Route exact path={`/d/${slug}`} component={RedirectDocument} />
            <Route
              exact
              path={`/doc/${slug}/history/:revisionId?`}
              component={Document}
            />
            <Route exact path={`/doc/${slug}/edit`} component={Document} />
            <Route path={`/doc/${slug}`} component={Document} />
            <Route exact path="/search" component={Search} />
            <Route exact path="/search/:term" component={Search} />
            <Route path="/404" component={Error404} />
            <SettingsRoutes />
            <Route component={Error404} />
          </Switch>
        </React.Suspense>
      </Layout>
    </SocketProvider>
  );
}
