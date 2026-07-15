import type { LocationDescriptor } from "history";
import { matchPath } from "react-router-dom";
import env from "~/env";
import {
  archivePath,
  draftsPath,
  homePath,
  matchCollectionSlug,
  matchDocumentSlug,
  searchPath,
  settingsPath,
  trashPath,
} from "~/utils/routeHelpers";

/**
 * Prefetches the lazy-loaded components associated with the route that the
 * given location resolves to, so the code is already available by the time
 * the user navigates there.
 *
 * Failures are ignored — the chunk will be requested again, with retries,
 * when the route actually renders.
 *
 * @param to the location the user is expected to navigate to.
 */
export function prefetchRouteComponents(to: LocationDescriptor): void {
  const path = typeof to === "string" ? to : to.pathname;
  if (!path) {
    return;
  }

  const pathname = path.split(/[?#]/)[0];
  const route = routes.find(({ paths }) =>
    paths.some((pattern) => matchPath(pathname, { path: pattern }))
  );

  void route?.load().catch(() => {
    // Prefetching is best effort.
  });
}

interface PrefetchableRoute {
  /** Route patterns, in react-router syntax, that render the component. */
  paths: string[];
  /** Imports the code-split chunk(s) associated with the route. */
  load: () => Promise<unknown>;
}

/**
 * Mirrors the lazy-loaded routes in `./index` and `./authenticated` — the
 * import specifiers must match those used there so the same chunk is loaded.
 */
const routes: PrefetchableRoute[] = env.ROOT_SHARE_ID
  ? [{ paths: ["/"], load: () => import("~/scenes/Shared") }]
  : [
      { paths: [draftsPath()], load: () => import("~/scenes/Drafts") },
      { paths: [archivePath()], load: () => import("~/scenes/Archive") },
      { paths: [trashPath()], load: () => import("~/scenes/Trash") },
      { paths: [homePath()], load: () => import("~/scenes/Home") },
      { paths: [searchPath()], load: () => import("~/scenes/Search") },
      {
        paths: [`/doc/${matchDocumentSlug}`, `/d/${matchDocumentSlug}`],
        load: () => import("~/scenes/Document"),
      },
      {
        paths: [`/collection/${matchCollectionSlug}`],
        load: () => import("~/scenes/Collection"),
      },
      { paths: [settingsPath()], load: () => import("./settings") },
      { paths: ["/s/:shareId"], load: () => import("~/scenes/Shared") },
    ];
