// @flow
import * as React from "react";
import { Switch, Route, Redirect, type Match } from "react-router-dom";
import Archive from "scenes/Archive";
import Collection from "scenes/Collection";
import Dashboard from "scenes/Dashboard";
import KeyedDocument from "scenes/Document/KeyedDocument";
import DocumentNew from "scenes/DocumentNew";
import Drafts from "scenes/Drafts";
import Error404 from "scenes/Error404";
import Search from "scenes/Search";
import Starred from "scenes/Starred";
import Templates from "scenes/Templates";
import Trash from "scenes/Trash";

import CenteredContent from "components/CenteredContent";
import Layout from "components/Layout";
import LoadingPlaceholder from "components/LoadingPlaceholder";
import SocketProvider from "components/SocketProvider";
import { matchDocumentSlug as slug } from "utils/routeHelpers";

const SettingsRoutes = React.lazy(() => import("./settings"));

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
    <SocketProvider>
      <Layout>
        <Switch>
          <Redirect from="/dashboard" to="/home" />
          <Route path="/home/:tab" component={Dashboard} />
          <Route path="/home" component={Dashboard} />
          <Route exact path="/starred" component={Starred} />
          <Route exact path="/starred/:sort" component={Starred} />
          <Route exact path="/templates" component={Templates} />
          <Route exact path="/templates/:sort" component={Templates} />
          <Route exact path="/drafts" component={Drafts} />
          <Route exact path="/archive" component={Archive} />
          <Route exact path="/trash" component={Trash} />
          <Route exact path="/collections/:id/new" component={DocumentNew} />
          <Route exact path="/collections/:id/:tab" component={Collection} />
          <Route exact path="/collections/:id" component={Collection} />
          <Route exact path={`/d/${slug}`} component={RedirectDocument} />
          <Route
            exact
            path={`/doc/${slug}/history/:revisionId?`}
            component={KeyedDocument}
          />
          <Route exact path={`/doc/${slug}/edit`} component={KeyedDocument} />
          <Route path={`/doc/${slug}`} component={KeyedDocument} />
          <Route exact path="/search" component={Search} />
          <Route exact path="/search/:term" component={Search} />
          <Route path="/404" component={Error404} />
          <React.Suspense
            fallback={
              <CenteredContent>
                <LoadingPlaceholder />
              </CenteredContent>
            }
          >
            <SettingsRoutes />
          </React.Suspense>
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </SocketProvider>
  );
}
