import type { History } from "history";
import { parsePath } from "history";
import { action, observable } from "mobx";
import queryString from "query-string";

/**
 * Name of the query string parameter that holds the route displayed in the
 * secondary pane of the split view. Keeping the value in the URL allows a
 * reload to hydrate both panes.
 */
export const splitViewQueryParam = "split";

/** Identifies a pane within the split view. */
export type SplitViewPane = "primary" | "secondary";

/**
 * Parses the split view route from a location search string.
 *
 * @param search the location search string, with or without a leading "?".
 * @returns the internal path shown in the secondary pane, or undefined when
 * no valid split route is present.
 */
export function getSplitPath(search: string): string | undefined {
  const value = queryString.parse(search)[splitViewQueryParam];
  const path = Array.isArray(value) ? value[value.length - 1] : value;

  if (typeof path !== "string") {
    return undefined;
  }

  // Only allow internal, absolute paths – never protocol-relative or full
  // URLs – as the value is used to drive the router directly.
  if (!path.startsWith("/") || path.startsWith("//")) {
    return undefined;
  }

  if (!isSplitablePath(parsePath(path).pathname)) {
    return undefined;
  }

  return path;
}

/**
 * Returns a new search string with the split view route set or removed,
 * preserving all other query parameters.
 *
 * @param search the current location search string.
 * @param path the internal path to open in the secondary pane, or undefined
 * to remove the split view parameter.
 * @returns the updated search string, prefixed with "?" when non-empty.
 */
export function setSplitPath(search: string, path: string | undefined): string {
  const params = queryString.parse(search);

  if (path === undefined) {
    delete params[splitViewQueryParam];
  } else {
    params[splitViewQueryParam] = path;
  }

  const stringified = queryString.stringify(params);
  return stringified ? `?${stringified}` : "";
}

const nonSplitViewPrefixes = [
  "/settings",
  "/s",
  "/share",
  "/login",
  "/logout",
  "/create",
  "/desktop-redirect",
  "/oauth",
  "/auth",
  "/404",
];

/**
 * Whether a route can be rendered inside a split view pane. Routes such as
 * settings or authentication render their own chrome and must always be
 * displayed full width.
 *
 * @param pathname the pathname to check.
 * @returns true if the route can be displayed in a split view pane.
 */
export function isSplitablePath(pathname: string): boolean {
  // Require an internal, absolute pathname – full URLs and protocol-relative
  // values must never be treated as splitable.
  if (!pathname.startsWith("/") || pathname.startsWith("//")) {
    return false;
  }

  if (pathname === "/") {
    return false;
  }

  return !nonSplitViewPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

const focusedSplitPane = observable.box<SplitViewPane>("primary");

/**
 * Returns the pane of the split view that currently has focus. Defaults to
 * the primary pane when no split view is open. The value is observable, so
 * observer components reading it re-render when focus changes.
 *
 * @returns the focused pane.
 */
export function getFocusedSplitPane(): SplitViewPane {
  return focusedSplitPane.get();
}

/**
 * Sets the pane of the split view that currently has focus. Navigation
 * triggered outside of a pane, such as from the sidebar or command bar, is
 * directed to the focused pane.
 *
 * @param pane the pane to focus.
 */
export const setFocusedSplitPane = action((pane: SplitViewPane): void => {
  focusedSplitPane.set(pane);
});

let navigationSuppressed = false;

/**
 * Whether split view handling of navigation is temporarily suppressed, used
 * when closing the split view so that the navigation is not rewritten.
 *
 * @returns true if split view navigation handling is suppressed.
 */
export function isSplitViewNavigationSuppressed(): boolean {
  return navigationSuppressed;
}

/**
 * Runs a callback with split view handling of navigation disabled, allowing
 * the exact location passed to history.push or history.replace to be used.
 *
 * @param callback the callback to run.
 */
export function withoutSplitViewNavigation(callback: () => void): void {
  navigationSuppressed = true;
  try {
    callback();
  } finally {
    navigationSuppressed = false;
  }
}

/**
 * Opens the given path in the secondary pane of the split view, keeping the
 * current route in the primary pane, and focuses the secondary pane.
 *
 * @param history the history instance to navigate with.
 * @param path the internal path to open in the secondary pane.
 */
export function openRouteInSplit(history: History, path: string): void {
  const { location } = history;
  setFocusedSplitPane("secondary");
  history.push({
    pathname: location.pathname,
    hash: location.hash,
    state: location.state,
    search: setSplitPath(location.search, path),
  });
}

/**
 * Closes one pane of the split view, leaving the other pane's route as the
 * single displayed route, and returns focus to the primary pane. Closing the
 * primary pane promotes the secondary route to become the main route.
 *
 * @param history the history instance to navigate with.
 * @param pane the pane to close, defaults to the secondary pane.
 */
export function closeSplitPane(
  history: History,
  pane: SplitViewPane = "secondary"
): void {
  const { location } = history;
  const splitPath = getSplitPath(location.search);
  setFocusedSplitPane("primary");
  withoutSplitViewNavigation(() => {
    if (pane === "primary" && splitPath !== undefined) {
      const target = parsePath(splitPath);
      history.push({
        ...target,
        search: setSplitPath(target.search, undefined),
      });
      return;
    }

    history.push({
      pathname: location.pathname,
      hash: location.hash,
      state: location.state,
      search: setSplitPath(location.search, undefined),
    });
  });
}
