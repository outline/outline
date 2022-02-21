import * as React from "react";
import { Switch } from "react-router-dom";
import DelayedMount from "~/components/DelayedMount";
import FullscreenLoading from "~/components/FullscreenLoading";
import Route from "~/components/ProfiledRoute";
import { matchDocumentSlug as slug } from "~/utils/routeHelpers";

const Authenticated = React.lazy(
  () =>
    import(
      /* webpackChunkName: "authenticated" */
      "~/components/Authenticated"
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
      "~/scenes/Document/Shared"
    )
);
const Login = React.lazy(
  () =>
    import(
      /* webpackChunkName: "login" */
      "~/scenes/Login"
    )
);
const Logout = React.lazy(
  () =>
    import(
      /* webpackChunkName: "logout" */
      "~/scenes/Logout"
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
        <Route exact path="/" component={Login} />
        <Route exact path="/create" component={Login} />
        <Route exact path="/logout" component={Logout} />

        <Route exact path="/share/:shareId" component={SharedDocument} />
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
