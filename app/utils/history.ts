import type {
  Location,
  LocationDescriptor,
  LocationDescriptorObject,
  LocationState,
} from "history";
import { createBrowserHistory, createPath, parsePath } from "history";
import {
  getFocusedSplitPane,
  getSplitPath,
  isSplitViewNavigationSuppressed,
  isSplitablePath,
  setSplitPath,
} from "./splitView";

/**
 * Creates a location descriptor from an existing location with the given fields
 * overridden. Only the pathname, search, hash, and state are carried over so
 * that internal fields (such as key) are not duplicated into the new entry.
 *
 * @param location The location to patch, typically history.location.
 * @param patch The location fields to override.
 * @returns A location descriptor suitable for history.push or history.replace.
 */
export function patchLocation(
  location: Location,
  patch: LocationDescriptorObject
): LocationDescriptorObject {
  const { pathname, search, hash, state } = location;
  return { pathname, search, hash, state, ...patch };
}

/**
 * Normalizes the arguments accepted by history.push and history.replace into
 * a location descriptor object.
 *
 * @param to the path or location descriptor passed to the history method.
 * @param state optional location state, used when `to` is a string.
 * @returns a location descriptor object.
 */
export function toLocationDescriptor(
  to: LocationDescriptor,
  state?: LocationState
): LocationDescriptorObject {
  if (typeof to === "string") {
    const location = parsePath(to);
    return state === undefined ? location : { ...location, state };
  }

  return to;
}

const history = createBrowserHistory();

/**
 * Applies split view handling to a navigation. While a split view is open:
 *
 * - Navigation to a route that cannot render in a pane closes the split view.
 * - Pushes are directed to the secondary pane when it has focus, keeping the
 *   primary route unchanged.
 * - All other navigation keeps the split view open by carrying the split
 *   query parameter over to the new location.
 */
function applySplitView(
  descriptor: LocationDescriptorObject,
  isReplace: boolean
): LocationDescriptorObject {
  if (isSplitViewNavigationSuppressed()) {
    return descriptor;
  }

  const current = history.location;
  const currentSplit = getSplitPath(current.search);
  if (currentSplit === undefined) {
    return descriptor;
  }

  // A location that explicitly includes the split parameter is used verbatim.
  if (getSplitPath(descriptor.search ?? "") !== undefined) {
    return descriptor;
  }

  const pathname = descriptor.pathname ?? current.pathname;
  if (!isSplitablePath(pathname)) {
    return descriptor;
  }

  if (!isReplace && getFocusedSplitPane() === "secondary") {
    return patchLocation(current, {
      search: setSplitPath(
        current.search,
        createPath({
          pathname,
          search: descriptor.search,
          hash: descriptor.hash,
        })
      ),
    });
  }

  return {
    ...descriptor,
    search: setSplitPath(descriptor.search ?? "", currentSplit),
  };
}

const browserPush = history.push.bind(history);
const browserReplace = history.replace.bind(history);

history.push = (to: LocationDescriptor, state?: LocationState) =>
  browserPush(applySplitView(toLocationDescriptor(to, state), false));

history.replace = (to: LocationDescriptor, state?: LocationState) =>
  browserReplace(applySplitView(toLocationDescriptor(to, state), true));

export default history;
