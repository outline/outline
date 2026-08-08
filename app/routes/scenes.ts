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
export const Dashboard = lazy(() => import("~/scenes/Dashboard"));
export const Pos = lazy(() => import("~/scenes/Pos"));
export const Orders = lazy(() => import("~/scenes/Orders"));
export const OrderDetail = lazy(() => import("~/scenes/OrderDetail"));
export const Inventory = lazy(() => import("~/scenes/Inventory"));
export const Accounting = lazy(() => import("~/scenes/Accounting"));
export const Grooming = lazy(() => import("~/scenes/Grooming"));
export const Loyalty = lazy(() => import("~/scenes/Loyalty"));
export const Staff = lazy(() => import("~/scenes/Staff"));
export const Branches = lazy(() => import("~/scenes/Branches"));
export const Occupancy = lazy(() => import("~/scenes/Occupancy"));
export const Boardings = lazy(() => import("~/scenes/Boardings"));
export const Products = lazy(() => import("~/scenes/Products"));
export const Customers = lazy(() => import("~/scenes/Customers"));
export const Trash = lazy(() => import("~/scenes/Trash"));

/**
 * Warms the chunks required to render a document with an editable editor. Each
 * of these is behind a separate lazy boundary that would otherwise only begin
 * downloading once the previous one has rendered, so preloading them in
 * parallel removes a request waterfall from the critical path.
 */
export function preloadEditor() {
  void Document.preload();
  void import("~/scenes/Document/components/MultiplayerEditor");
  void import("~/editor");
}
