import { createContext, useContext } from "react";
import type { SplitViewPane } from "~/utils/splitView";

export interface SplitViewContextValue {
  /** The pane of the split view this subtree is rendered in. */
  pane: SplitViewPane;
  /** Whether a split view is currently open. */
  isSplitView: boolean;
  /** Whether the pane this subtree is rendered in currently has focus. */
  isFocused: boolean;
}

/**
 * Context describing the split view pane a component is rendered within.
 * Outside of a split view the default value describes a focused primary pane.
 */
export const SplitViewContext = createContext<SplitViewContextValue>({
  pane: "primary",
  isSplitView: false,
  isFocused: true,
});

/**
 * Returns the split view context for the current component subtree.
 *
 * @returns the split view context value.
 */
export function useSplitView(): SplitViewContextValue {
  return useContext(SplitViewContext);
}
