import { Suspense } from "react";
import { Switch, Redirect } from "react-router-dom";
import DesktopRedirect from "~/scenes/DesktopRedirect";
import DelayedMount from "~/components/DelayedMount";
import FullscreenLoading from "~/components/FullscreenLoading";
import Route from "~/components/ProfiledRoute";
import env from "~/env";
import lazy from "~/utils/lazyWithRetry";
import { matchDocumentSlug as documentSlug } from "~/utils/routeHelpers";
import useAutoRefresh from "~/hooks/useAutoRefresh";

const Authenticated = lazy(() => import("~/components/Authenticated"));
const AuthenticatedRoutes = lazy(() => import("./authenticated"));
const Shared = lazy(() => import("~/scenes/Shared"));
const Login = lazy(() => import("~/scenes/Login"));
const Logout = lazy(() => import("~/scenes/Logout"));
const OAuthAuthorize = lazy(() => import("~/scenes/Login/OAuthAuthorize"));
const PublicBooking = lazy(() => import("~/scenes/Public/Booking"));
const PublicBoarding = lazy(() => import("~/scenes/Public/Boarding"));
const PublicFeatured = lazy(() => import("~/scenes/Public/Featured"));

export default function Routes() {
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

          {/* Public, per-business pages. These sit outside Authenticated
              because a visitor booking a stay has no account. */}
          <Route
            exact
            path="/p/:businessSlug/booking"
            component={PublicBooking}
          />
          <Route
            exact
            path="/p/:businessSlug/boarding"
            component={PublicBoarding}
          />
          <Route
            exact
            path="/p/:businessSlug/featured"
            component={PublicFeatured}
          />
          <Redirect
            exact
            from="/p/:businessSlug"
            to="/p/:businessSlug/booking"
          />

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
