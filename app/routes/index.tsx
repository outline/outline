import * as React from "react";
import { Switch, Redirect } from "react-router-dom";
import DesktopRedirect from "~/scenes/DesktopRedirect";
import DelayedMount from "~/components/DelayedMount";
import FullscreenLoading from "~/components/FullscreenLoading";
import Route from "~/components/ProfiledRoute";
import env from "~/env";
import useQueryNotices from "~/hooks/useQueryNotices";
import lazyWithRetry from "~/utils/lazyWithRetry";
import { matchDocumentSlug as slug } from "~/utils/routeHelpers";

const Authenticated = lazyWithRetry(() => import("~/components/Authenticated"));
const AuthenticatedRoutes = lazyWithRetry(() => import("./authenticated"));
const SharedDocument = lazyWithRetry(() => import("~/scenes/Document/Shared"));
const Login = lazyWithRetry(() => import("~/scenes/Login"));
const Logout = lazyWithRetry(() => import("~/scenes/Logout"));

export default function Routes() {
  useQueryNotices();

  return (
    <React.Suspense
      fallback={
        <DelayedMount delay={2000}>
          <FullscreenLoading />
        </DelayedMount>
      }
    >
      {env.ROOT_SHARE_ID ? (
        <Switch>
          <Route exact path="/" component={SharedDocument} />
          <Route exact path={`/doc/${slug}`} component={SharedDocument} />
          <Redirect exact from="/s/:shareId" to="/" />
          <Redirect
            exact
            from={`/s/:shareId/doc/${slug}`}
            to={`/doc/${slug}`}
          />
        </Switch>
      ) : (
        <Switch>
          <Route exact path="/" component={Login} />
          <Route exact path="/create" component={Login} />
          <Route exact path="/logout" component={Logout} />
          <Route exact path="/desktop-redirect" component={DesktopRedirect} />

          <Redirect exact from="/share/:shareId" to="/s/:shareId" />
          <Route exact path="/s/:shareId" component={SharedDocument} />

          <Redirect
            exact
            from={`/share/:shareId/doc/${slug}`}
            to={`/s/:shareId/doc/${slug}`}
          />
          <Route
            exact
            path={`/s/:shareId/doc/${slug}`}
            component={SharedDocument}
          />

          <Authenticated>
            <AuthenticatedRoutes />
          </Authenticated>
        </Switch>
      )}
    </React.Suspense>
  );
}
