import type { History, LocationDescriptor } from "history";
import { createPath, parsePath } from "history";
import { action, observable } from "mobx";
import queryString from "query-string";
import { isMobile } from "@shared/utils/browser";
import { isModKey } from "@shared/utils/keyboard";

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

let splitModifierPressed = false;

/**
 * Whether an event carries the modifier combination that opens a route in the
 * secondary pane of the split view.
 *
 * @param event the keyboard or mouse event to check.
 * @returns true if the split view modifier combination is held.
 */
export function isSplitViewModifierEvent(
  event: KeyboardEvent | MouseEvent
): boolean {
  return isModKey(event) && !event.shiftKey && !event.altKey;
}

/**
 * Starts tracking whether the split view modifier combination is held during
 * events dispatched to the window, allowing code without direct access to the
 * triggering event, such as command bar actions, to check it with
 * isSplitViewModifierPressed. Synthetic clicks, such as the one kbar
 * dispatches when Enter is pressed, are ignored so the state of the
 * originating keyboard event is preserved.
 *
 * @returns a function that stops tracking.
 */
export function trackSplitViewModifier(): () => void {
  const record = (event: KeyboardEvent | MouseEvent) => {
    splitModifierPressed = isSplitViewModifierEvent(event);
  };
  const handleClick = (event: MouseEvent) => {
    // Clicks not produced by a pointer press carry no modifier state.
    if (event.detail === 0) {
      return;
    }
    record(event);
  };

  window.addEventListener("keydown", record, { capture: true });
  window.addEventListener("click", handleClick, { capture: true });

  return () => {
    splitModifierPressed = false;
    window.removeEventListener("keydown", record, { capture: true });
    window.removeEventListener("click", handleClick, { capture: true });
  };
}

/**
 * Whether the split view modifier combination was held during the most recent
 * tracked event, see trackSplitViewModifier. Intended to be read while that
 * event is still being dispatched.
 *
 * @returns true if the split view modifier is held.
 */
export function isSplitViewModifierPressed(): boolean {
  return splitModifierPressed;
}

/**
 * Navigates to the given location, opening it in the secondary pane of the
 * split view instead when the split view modifier is held and the route can
 * render in a pane.
 *
 * @param history the history instance to navigate with.
 * @param to the path or location descriptor to navigate to.
 */
export function pushOrOpenInSplit(
  history: History,
  to: LocationDescriptor
): void {
  if (isSplitViewModifierPressed() && !isMobile()) {
    const location = typeof to === "string" ? parsePath(to) : to;

    // Location state cannot be represented in the split query parameter, so
    // routes that rely on it must navigate normally.
    if (
      location.state === undefined &&
      location.pathname &&
      isSplitablePath(location.pathname)
    ) {
      openRouteInSplit(history, createPath(location));
      return;
    }
  }

  history.push(to);
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
