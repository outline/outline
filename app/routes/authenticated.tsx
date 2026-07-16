import { observer } from "mobx-react";
import { Suspense } from "react";
import type { RouteObject } from "react-router-dom";
import { Navigate, useParams, useRoutes } from "react-router-dom";
import DocumentNew from "~/scenes/DocumentNew";
import Error404 from "~/scenes/Errors/Error404";
import AuthenticatedLayout from "~/components/AuthenticatedLayout";
import CenteredContent from "~/components/CenteredContent";
import PlaceholderDocument from "~/components/PlaceholderDocument";
import WebsocketProvider from "~/components/WebsocketProvider";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useQueryNotices from "~/hooks/useQueryNotices";
import lazy from "~/utils/lazyWithRetry";
import {
  homePath,
  searchPath,
  settingsPath,
  matchDocumentSlug as documentSlug,
  matchCollectionSlug as collectionSlug,
} from "~/utils/routeHelpers";
import env from "~/env";

const SettingsRoutes = lazy(() => import("./settings"));
const Archive = lazy(() => import("~/scenes/Archive"));
const Collection = lazy(() => import("~/scenes/Collection"));
const Document = lazy(() => import("~/scenes/Document"));
const Drafts = lazy(() => import("~/scenes/Drafts"));
const Home = lazy(() => import("~/scenes/Home"));
const Search = lazy(() => import("~/scenes/Search"));
const Trash = lazy(() => import("~/scenes/Trash"));
const Debug = lazy(() => import("~/scenes/Developer/Debug"));
const Changesets = lazy(() => import("~/scenes/Developer/Changesets"));

/** Strips the leading slash so a path can be used as a descendant route. */
const rel = (path: string) => path.replace(/^\//, "");

/** Redirects a `/d/:documentSlug` short link to its canonical document path. */
function RedirectDocument() {
  const { documentSlug: slug } = useParams();
  return <Navigate to={slug ? `/doc/${slug}` : homePath()} replace />;
}

/** Redirects a legacy `/collections/*` path to its `/collection/*` form. */
function RedirectCollections() {
  const params = useParams();
  return <Navigate to={`/collection/${params["*"] ?? ""}`} replace />;
}

/**
 * The authenticated routes are all the routes of the application that require
 * the user to be logged in.
 */
function AuthenticatedRoutes() {
  useQueryNotices();
  const team = useCurrentTeam();
  const can = usePolicy(team);

  const routes: RouteObject[] = [
    ...(can.createDocument
      ? [
          { path: rel("/drafts"), element: <Drafts /> },
          { path: rel("/archive"), element: <Archive /> },
          { path: rel("/trash"), element: <Trash /> },
        ]
      : []),
    { path: `${rel(homePath())}/*`, element: <Home /> },
    { path: "dashboard", element: <Navigate to={homePath()} replace /> },
    { path: "starred", element: <Navigate to={homePath()} replace /> },
    {
      path: "templates",
      element: <Navigate to={settingsPath("templates")} replace />,
    },
    { path: "collections/*", element: <RedirectCollections /> },
    {
      path: `collection/${collectionSlug}/new`,
      element: <DocumentNew />,
    },
    {
      path: `collection/${collectionSlug}/*`,
      element: <Collection />,
    },
    { path: "doc/new", element: <DocumentNew /> },
    { path: `d/${documentSlug}`, element: <RedirectDocument /> },
    {
      path: `doc/${documentSlug}/history/:revisionId?`,
      element: <Document />,
    },
    { path: `doc/${documentSlug}/edit`, element: <Document /> },
    { path: `doc/${documentSlug}/*`, element: <Document /> },
    { path: `${rel(searchPath())}/:query?`, element: <Search /> },
    ...(env.isDevelopment
      ? [
          { path: rel("/debug"), element: <Debug /> },
          { path: rel("/debug/changesets"), element: <Changesets /> },
        ]
      : []),
    { path: "404", element: <Error404 /> },
    { path: "settings/*", element: <SettingsRoutes /> },
    { path: "*", element: <Error404 /> },
  ];

  const element = useRoutes(routes);

  return (
    <WebsocketProvider>
      <AuthenticatedLayout>
        <Suspense
          fallback={
            <CenteredContent>
              <PlaceholderDocument />
            </CenteredContent>
          }
        >
          {element}
        </Suspense>
      </AuthenticatedLayout>
    </WebsocketProvider>
  );
}

export default observer(AuthenticatedRoutes);
