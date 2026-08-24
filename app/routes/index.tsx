import { Suspense } from "react";
import { Switch, Redirect } from "react-router-dom";
import DelayedMount from "~/components/DelayedMount";
import FullscreenLoading from "~/components/FullscreenLoading";
import Route from "~/components/ProfiledRoute";
import lazy from "~/utils/lazyWithRetry";
import useAutoRefresh from "~/hooks/useAutoRefresh";
const Authenticated = lazy(() => import("~/components/Authenticated"));
const AuthenticatedRoutes = lazy(() => import("./authenticated"));
const ShopLogin = lazy(() => import("~/scenes/Auth/Login"));
const ShopSignup = lazy(() => import("~/scenes/Auth/Signup"));
const ShopForgotPassword = lazy(() => import("~/scenes/Auth/ForgotPassword"));
const ShopResetPassword = lazy(() => import("~/scenes/Auth/ResetPassword"));
const PublicBooking = lazy(() => import("~/scenes/Public/Booking"));
const PublicBoarding = lazy(() => import("~/scenes/Public/Boarding"));
const PublicFeatured = lazy(() => import("~/scenes/Public/Featured"));
const PublicProduct = lazy(() => import("~/scenes/Public/Product"));
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
      <Switch>
        <Redirect exact from="/" to="/dashboard" />
        <Route exact path="/login" component={ShopLogin} />
        <Route exact path="/signup" component={ShopSignup} />
        <Route exact path="/forgot-password" component={ShopForgotPassword} />
        <Route exact path="/reset-password" component={ShopResetPassword} />

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
        <Route
          exact
          path="/p/:businessSlug/products/:productId"
          component={PublicProduct}
        />
        <Redirect exact from="/p/:businessSlug" to="/p/:businessSlug/booking" />

        <Authenticated>
          <AuthenticatedRoutes />
        </Authenticated>
      </Switch>
    </Suspense>
  );
}
