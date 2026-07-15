import type { LocationDescriptor } from "history";
import { matchPath } from "react-router-dom";
import env from "~/env";
import { routeMap } from "./map";

/**
 * Preloads the lazy-loaded components associated with the route that the
 * given location resolves to, so the code is already available by the time
 * the user navigates there.
 *
 * Failures are ignored — the chunk will be requested again, with retries,
 * when the route actually renders.
 *
 * @param to the location the user is expected to navigate to.
 */
export function preloadRouteComponents(to: LocationDescriptor): void {
  const path = typeof to === "string" ? to : to.pathname;
  if (!path) {
    return;
  }

  const pathname = path.split(/[?#]/)[0];

  // When hosted as a public share the entire app renders the shared scene.
  const route = env.ROOT_SHARE_ID
    ? routeMap.shared
    : Object.values(routeMap).find(({ paths }) =>
        paths.some((pattern) => matchPath(pathname, { path: pattern }))
      );

  void route?.preload().catch(() => {
    // Preloading is best effort.
  });
}
