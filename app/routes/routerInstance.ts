import type { createBrowserRouter } from "react-router-dom";

type DataRouter = ReturnType<typeof createBrowserRouter>;

let instance: DataRouter | undefined;

/**
 * Stores the application's data router so it can be accessed imperatively from
 * outside React (for example by the history adapter).
 *
 * @param router the data router to store.
 */
export function setRouter(router: DataRouter): void {
  instance = router;
}

/**
 * Returns the application's data router.
 *
 * @returns the data router.
 * @throws if the router has not been initialized yet.
 */
export function getRouter(): DataRouter {
  if (!instance) {
    throw new Error("Router has not been initialized");
  }
  return instance;
}
