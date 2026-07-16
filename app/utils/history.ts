import type { Location, Path, To } from "react-router-dom";
import { getRouter } from "~/routes/routerInstance";

/** A location descriptor that may additionally carry navigation state. */
type ToWithState = To & { state?: unknown };

/**
 * Splits a location descriptor into the navigation target and its state. In
 * react-router v5 the state could be embedded in the location object; the data
 * router instead accepts state as a separate option, so we extract it here to
 * keep existing call sites working.
 */
function extractState(
  to: ToWithState,
  explicitState?: unknown
): { to: To; state: unknown } {
  if (to && typeof to === "object" && "state" in to) {
    const { state, ...path } = to;
    return { to: path, state: explicitState ?? state };
  }
  return { to, state: explicitState };
}

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
  patch: Partial<Path> & { state?: unknown }
): Partial<Path> & { state?: unknown } {
  const { pathname, search, hash, state } = location;
  return { pathname, search, hash, state, ...patch };
}

/**
 * A minimal history-compatible adapter backed by the data router. It preserves
 * the imperative `history.push`/`history.replace`/`history.location` API used
 * throughout the app so that navigation from non-React code (actions, dialogs,
 * stores) continues to work without a standalone history instance.
 */
const history = {
  /** The current location as tracked by the router. */
  get location(): Location {
    return getRouter().state.location;
  },

  /**
   * Pushes a new entry onto the history stack.
   *
   * @param to The location to navigate to.
   * @param state Optional navigation state.
   */
  push(to: ToWithState, state?: unknown) {
    const target = extractState(to, state);
    void getRouter().navigate(target.to, { state: target.state });
  },

  /**
   * Replaces the current entry on the history stack.
   *
   * @param to The location to navigate to.
   * @param state Optional navigation state.
   */
  replace(to: ToWithState, state?: unknown) {
    const target = extractState(to, state);
    void getRouter().navigate(target.to, {
      replace: true,
      state: target.state,
    });
  },

  /** Navigates back one entry in the history stack. */
  goBack() {
    void getRouter().navigate(-1);
  },

  /**
   * Navigates by the given delta in the history stack.
   *
   * @param delta The number of entries to move, negative for backwards.
   */
  go(delta: number) {
    void getRouter().navigate(delta);
  },

  /**
   * Subscribes to location changes.
   *
   * @param listener Called whenever the location changes.
   * @returns A function that removes the listener.
   */
  listen(listener: () => void) {
    return getRouter().subscribe(() => listener());
  },
};

export default history;
