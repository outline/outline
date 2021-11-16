import * as React from "react";
// @ts-expect-error ts-migrate(2724) FIXME: '"react-router-dom"' has no exported member named ... Remove this comment to see the full error message
import { Match } from "react-router-dom";
import { Switch, Redirect } from "react-router-dom";
import Archive from "scenes/Archive";
import Collection from "scenes/Collection";
import DocumentNew from "scenes/DocumentNew";
import Drafts from "scenes/Drafts";
import Error404 from "scenes/Error404";
import Home from "scenes/Home";
import Search from "scenes/Search";
import Templates from "scenes/Templates";
import Trash from "scenes/Trash";
import CenteredContent from "components/CenteredContent";
import Layout from "components/Layout";
import PlaceholderDocument from "components/PlaceholderDocument";
// @ts-expect-error ts-migrate(7034) FIXME: Variable 'Route' implicitly has type 'any' in some... Remove this comment to see the full error message
import Route from "components/ProfiledRoute";
import SocketProvider from "components/SocketProvider";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/routeHelpers' or its cor... Remove this comment to see the full error message
import { matchDocumentSlug as slug } from "utils/routeHelpers";

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
      "scenes/Document"
    )
);

const NotFound = () => <Search notFound />;

const RedirectDocument = ({ match }: { match: Match }) => (
  <Redirect
    to={
      match.params.documentSlug ? `/doc/${match.params.documentSlug}` : "/home"
    }
  />
);

export default function AuthenticatedRoutes() {
  return (
    // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
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
            // @ts-expect-error ts-migrate(7005) FIXME: Variable 'Route'
            implicitly has an 'any' type.
            <Route path="/home/:tab" component={Home} />
            // @ts-expect-error ts-migrate(7005) FIXME: Variable 'Route'
            implicitly has an 'any' type.
            <Route path="/home" component={Home} />
            // @ts-expect-error ts-migrate(7005) FIXME: Variable 'Route'
            implicitly has an 'any' type.
            <Route exact path="/templates" component={Templates} />
            // @ts-expect-error ts-migrate(7005) FIXME: Variable 'Route'
            implicitly has an 'any' type.
            <Route exact path="/templates/:sort" component={Templates} />
            // @ts-expect-error ts-migrate(7005) FIXME: Variable 'Route'
            implicitly has an 'any' type.
            <Route exact path="/drafts" component={Drafts} />
            // @ts-expect-error ts-migrate(7005) FIXME: Variable 'Route'
            implicitly has an 'any' type.
            <Route exact path="/archive" component={Archive} />
            // @ts-expect-error ts-migrate(7005) FIXME: Variable 'Route'
            implicitly has an 'any' type.
            <Route exact path="/trash" component={Trash} />
            <Redirect exact from="/starred" to="/home" />
            <Redirect exact from="/collections/*" to="/collection/*" />
            // @ts-expect-error ts-migrate(7005) FIXME: Variable 'Route'
            implicitly has an 'any' type.
            <Route exact path="/collection/:id/new" component={DocumentNew} />
            // @ts-expect-error ts-migrate(7005) FIXME: Variable 'Route'
            implicitly has an 'any' type.
            <Route exact path="/collection/:id/:tab" component={Collection} />
            // @ts-expect-error ts-migrate(7005) FIXME: Variable 'Route'
            implicitly has an 'any' type.
            <Route exact path="/collection/:id" component={Collection} />
            // @ts-expect-error ts-migrate(7005) FIXME: Variable 'Route'
            implicitly has an 'any' type.
            <Route exact path={`/d/${slug}`} component={RedirectDocument} />
            // @ts-expect-error ts-migrate(7005) FIXME: Variable 'Route'
            implicitly has an 'any' type.
            <Route
              exact
              path={`/doc/${slug}/history/:revisionId?`}
              component={Document}
            />
            // @ts-expect-error ts-migrate(7005) FIXME: Variable 'Route'
            implicitly has an 'any' type.
            <Route exact path={`/doc/${slug}/edit`} component={Document} />
            // @ts-expect-error ts-migrate(7005) FIXME: Variable 'Route'
            implicitly has an 'any' type.
            <Route path={`/doc/${slug}`} component={Document} />
            // @ts-expect-error ts-migrate(7005) FIXME: Variable 'Route'
            implicitly has an 'any' type.
            <Route exact path="/search" component={Search} />
            // @ts-expect-error ts-migrate(7005) FIXME: Variable 'Route'
            implicitly has an 'any' type.
            <Route exact path="/search/:term" component={Search} />
            // @ts-expect-error ts-migrate(7005) FIXME: Variable 'Route'
            implicitly has an 'any' type.
            <Route path="/404" component={Error404} />
            <SettingsRoutes />
            // @ts-expect-error ts-migrate(7005) FIXME: Variable 'Route'
            implicitly has an 'any' type.
            <Route component={NotFound} />
          </Switch>{" "}
        </React.Suspense>
      </Layout>
    </SocketProvider>
  );
}
