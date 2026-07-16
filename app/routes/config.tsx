import type { RouteObject } from "react-router-dom";
import { Navigate, useParams } from "react-router-dom";
import DesktopRedirect from "~/scenes/DesktopRedirect";
import Root from "~/routes/Root";
import env from "~/env";
import lazy from "~/utils/lazyWithRetry";

const Authenticated = lazy(() => import("~/components/Authenticated"));
const AuthenticatedRoutes = lazy(() => import("./authenticated"));
const Shared = lazy(() => import("~/scenes/Shared"));
const Login = lazy(() => import("~/scenes/Login"));
const Logout = lazy(() => import("~/scenes/Logout"));
const OAuthAuthorize = lazy(() => import("~/scenes/Login/OAuthAuthorize"));

/** Redirects a legacy `/share/:shareId` path to its `/s/:shareId` equivalent. */
function RedirectShare() {
  const { shareId } = useParams();
  return <Navigate to={`/s/${shareId}`} replace />;
}

/** Redirects a `/share/:shareId/doc/:documentSlug` path to its `/s/` form. */
function RedirectShareDocument() {
  const { shareId, documentSlug } = useParams();
  return <Navigate to={`/s/${shareId}/doc/${documentSlug}`} replace />;
}

/** Redirects a shared document path to its root-share form. */
function RedirectRootShareDocument() {
  const { documentSlug } = useParams();
  return <Navigate to={`/doc/${documentSlug}`} replace />;
}

const sharedRootChildren: RouteObject[] = [
  { index: true, element: <Shared /> },
  { path: "doc/:documentSlug", element: <Shared /> },
  { path: "s/:shareId", element: <Navigate to="/" replace /> },
  {
    path: "s/:shareId/doc/:documentSlug",
    element: <RedirectRootShareDocument />,
  },
];

const appChildren: RouteObject[] = [
  { index: true, element: <Login /> },
  { path: "create", element: <Login /> },
  { path: "logout", element: <Logout /> },
  { path: "desktop-redirect", element: <DesktopRedirect /> },
  { path: "oauth/authorize", element: <OAuthAuthorize /> },
  { path: "share/:shareId", element: <RedirectShare /> },
  { path: "s/:shareId", element: <Shared /> },
  {
    path: "share/:shareId/doc/:documentSlug",
    element: <RedirectShareDocument />,
  },
  { path: "s/:shareId/doc/:documentSlug", element: <Shared /> },
  {
    path: "*",
    element: (
      <Authenticated>
        <AuthenticatedRoutes />
      </Authenticated>
    ),
  },
];

/** The application route configuration consumed by the data router. */
export const routes: RouteObject[] = [
  {
    element: <Root />,
    children: env.ROOT_SHARE_ID ? sharedRootChildren : appChildren,
  },
];
