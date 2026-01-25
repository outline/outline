import { Suspense } from "react";
import { Switch, Redirect } from "react-router-dom";
import DesktopRedirect from "~/scenes/DesktopRedirect";
import DelayedMount from "~/components/DelayedMount";
import FullscreenLoading from "~/components/FullscreenLoading";
import Route from "~/components/ProfiledRoute";
import env from "~/env";
import useQueryNotices from "~/hooks/useQueryNotices";
import lazy from "~/utils/lazyWithRetry";
import { matchDocumentSlug as documentSlug } from "~/utils/routeHelpers";
import useAutoRefresh from "~/hooks/useAutoRefresh";

const Authenticated = lazy(() => import("~/components/Authenticated"));
const AuthenticatedRoutes = lazy(() => import("./authenticated"));
const Shared = lazy(() => import("~/scenes/Shared"));
const Login = lazy(() => import("~/scenes/Login"));
const Logout = lazy(() => import("~/scenes/Logout"));
const OAuthAuthorize = lazy(() => import("~/scenes/Login/OAuthAuthorize"));

export default function Routes() {
  useQueryNotices();
  useAutoRefresh();

  return (
    <Suspense
      fallback={
        <DelayedMount delay={2000}>
          <FullscreenLoading />
        </DelayedMount>
      }
    >
      {env.ROOT_SHARE_ID ? (
        <Switch>
          <Route exact path="/" component={Shared} />
          <Route exact path={`/doc/${documentSlug}`} component={Shared} />
          <Redirect exact from="/s/:shareId" to="/" />
          <Redirect
            exact
            from={`/s/:shareId/doc/${documentSlug}`}
            to={`/doc/${documentSlug}`}
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
          <Route exact path="/s/:shareId" component={Shared} />

          <Redirect
            exact
            from={`/share/:shareId/doc/${documentSlug}`}
            to={`/s/:shareId/doc/${documentSlug}`}
          />
          <Route
            exact
            path={`/s/:shareId/doc/${documentSlug}`}
            component={Shared}
          />

          <Authenticated>
            <AuthenticatedRoutes />
          </Authenticated>
        </Switch>
      )}
    </Suspense>
  );
}
