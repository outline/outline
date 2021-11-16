import * as React from "react";
import { Switch } from "react-router-dom";
import DelayedMount from "components/DelayedMount";
import FullscreenLoading from "components/FullscreenLoading";
// @ts-expect-error ts-migrate(7034) FIXME: Variable 'Route' implicitly has type 'any' in some... Remove this comment to see the full error message
import Route from "components/ProfiledRoute";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/routeHelpers' or its cor... Remove this comment to see the full error message
import { matchDocumentSlug as slug } from "utils/routeHelpers";

const Authenticated = React.lazy(
  () =>
    import(
      /* webpackChunkName: "authenticated" */
      "components/Authenticated"
    )
);
const AuthenticatedRoutes = React.lazy(
  () =>
    import(
      /* webpackChunkName: "authenticated-routes" */
      "./authenticated"
    )
);
const SharedDocument = React.lazy(
  () =>
    import(
      /* webpackChunkName: "shared-document" */
      "scenes/Document/Shared"
    )
);
const Login = React.lazy(
  () =>
    import(
      /* webpackChunkName: "login" */
      "scenes/Login"
    )
);
const Logout = React.lazy(
  () =>
    import(
      /* webpackChunkName: "logout" */
      "scenes/Logout"
    )
);

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
        // @ts-expect-error ts-migrate(7005) FIXME: Variable 'Route' implicitly
        has an 'any' type.
        <Route exact path="/" component={Login} />
        // @ts-expect-error ts-migrate(7005) FIXME: Variable 'Route' implicitly
        has an 'any' type.
        <Route exact path="/create" component={Login} />
        // @ts-expect-error ts-migrate(7005) FIXME: Variable 'Route' implicitly
        has an 'any' type.
        <Route exact path="/logout" component={Logout} />
        // @ts-expect-error ts-migrate(7005) FIXME: Variable 'Route' implicitly
        has an 'any' type.
        <Route exact path="/share/:shareId" component={SharedDocument} />
        // @ts-expect-error ts-migrate(7005) FIXME: Variable 'Route' implicitly
        has an 'any' type.
        <Route
          exact
          path={`/share/:shareId/doc/${slug}`}
          component={SharedDocument}
        />
        <Authenticated>
          <AuthenticatedRoutes />
        </Authenticated>
      </Switch>
    </React.Suspense>
  );
}
