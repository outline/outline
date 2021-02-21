// @flow
import * as React from "react";
import { Switch, Route } from "react-router-dom";
import DelayedMount from "components/DelayedMount";
import FullscreenLoading from "components/FullscreenLoading";
import RevisionDiffExample from "components/RevisionDiffExample";

const Authenticated = React.lazy(() => import("components/Authenticated"));
const AuthenticatedRoutes = React.lazy(() => import("./authenticated"));
const KeyedDocument = React.lazy(() => import("scenes/Document/KeyedDocument"));
const Login = React.lazy(() => import("scenes/Login"));

export default function Routes() {
  return (
    <React.Suspense
      fallback={
        <DelayedMount delay={2000}>
          <FullscreenLoading />
        </DelayedMount>
      }
    >
      <Switch>
        <Route exact path="/" component={Login} />
        <Route exact path="/create" component={Login} />
        <Route exact path="/share/:shareId" component={KeyedDocument} />

        {/* TODO this is just a development harness -- delete later */}
        <Route
          exact
          path="/revisionDiffExample"
          component={RevisionDiffExample}
        />

        <Authenticated>
          <AuthenticatedRoutes />
        </Authenticated>
      </Switch>
    </React.Suspense>
  );
}
