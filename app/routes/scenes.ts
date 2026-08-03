import { createLazyComponent as lazy } from "~/components/LazyLoad";

/**
 * Lazy-loaded scenes for the authenticated routes. Defined separately from the
 * route definitions so that components such as the sidebar can preload a
 * scene's chunk without importing the routes themselves.
 */
export const Archive = lazy(() => import("~/scenes/Archive"));
export const Collection = lazy(() => import("~/scenes/Collection"));
export const Document = lazy(() => import("~/scenes/Document"));
export const Drafts = lazy(() => import("~/scenes/Drafts"));
export const Home = lazy(() => import("~/scenes/Home"));
export const Search = lazy(() => import("~/scenes/Search"));
export const Trash = lazy(() => import("~/scenes/Trash"));
