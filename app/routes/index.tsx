import * as React from "react";
import { Switch, Redirect } from "react-router-dom";
import DesktopRedirect from "~/scenes/DesktopRedirect";
import DelayedMount from "~/components/DelayedMount";
import FullscreenLoading from "~/components/FullscreenLoading";
import Route from "~/components/ProfiledRoute";
import env from "~/env";
import useQueryNotices from "~/hooks/useQueryNotices";
import lazy from "~/utils/lazyWithRetry";
import { matchDocumentSlug as slug } from "~/utils/routeHelpers";

const Authenticated = lazy(() => import("~/components/Authenticated"));
const AuthenticatedRoutes = lazy(() => import("./authenticated"));
const SharedDocument = lazy(() => import("~/scenes/Document/Shared"));
const Login = lazy(() => import("~/scenes/Login"));
const Logout = lazy(() => import("~/scenes/Logout"));
const OAuthAuthorize = lazy(() => import("~/scenes/Login/OAuthAuthorize"));

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
          <Route exact path="/oauth/authorize" component={OAuthAuthorize} />

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
