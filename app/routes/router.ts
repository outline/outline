import * as Sentry from "@sentry/react";
import { createBrowserRouter } from "react-router-dom";
import env from "~/env";
import { routes } from "./config";
import { setRouter } from "./routerInstance";

const create = env.SENTRY_DSN
  ? Sentry.wrapCreateBrowserRouterV6(createBrowserRouter)
  : createBrowserRouter;

/**
 * The application's data router instance. Exposes imperative navigation via
 * `router.navigate` and the current location via `router.state.location`,
 * replacing the standalone history object for use outside of React.
 */
export const router = create(routes);

// Register the router in a lightweight holder so the history adapter can reach
// it imperatively. The adapter cannot import this module directly: `~/utils/history`
// is pulled in (via config -> Root -> useActionContext) while this module is still
// evaluating, which would create an import cycle and drag the whole route/provider
// graph into every consumer of the history util (and its tests).
setRouter(router);
