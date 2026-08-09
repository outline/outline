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
const Docs = lazy(() => import("~/scenes/Marketing/Docs"));
const Contact = lazy(() => import("~/scenes/Marketing/Contact"));
const Download = lazy(() => import("~/scenes/Marketing/Download"));
const Privacy = lazy(() =>
  import("~/scenes/Marketing/Legal").then((mod) => ({
    default: mod.Privacy,
  }))
);
const Terms = lazy(() =>
  import("~/scenes/Marketing/Legal").then((mod) => ({ default: mod.Terms }))
);
const ShopLogin = lazy(() => import("~/scenes/Auth/Login"));
const ShopSignup = lazy(() => import("~/scenes/Auth/Signup"));
const ShopForgotPassword = lazy(() => import("~/scenes/Auth/ForgotPassword"));
const ShopResetPassword = lazy(() => import("~/scenes/Auth/ResetPassword"));
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

          {/* Public content pages. */}
          <Route exact path="/docs" component={Docs} />
          <Route exact path="/docs/:topic" component={Docs} />
          <Route exact path="/contact" component={Contact} />
          <Route exact path="/privacy" component={Privacy} />
          <Route exact path="/terms" component={Terms} />
          <Route exact path="/download" component={Download} />

          {/* The shop's own sign-in pages. Outline's existing auth stays on
              "/" – these are the routes the product uses. */}
          <Route exact path="/login" component={ShopLogin} />
          <Route exact path="/signup" component={ShopSignup} />
          <Route exact path="/forgot-password" component={ShopForgotPassword} />
          <Route exact path="/reset-password" component={ShopResetPassword} />

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
