import type { SidebarContextType } from "~/components/Sidebar/components/SidebarContext";
import { useSplitView } from "~/components/SplitView/context";
import { getFocusedSplitPane, getSplitPath } from "~/utils/splitView";
import { useLocationSelector } from "./useLocationSelector";

/**
 * Hook to retrieve the sidebar context that the sidebar should treat as
 * active. When a secondary split view pane has focus, this resolves to that
 * pane's context so that sidebar auto-expansion and active state follow the
 * focused pane rather than the primary browser location.
 *
 * The focused pane is observable, so the calling component must be wrapped in
 * `observer` to update when focus changes.
 *
 * @returns the active sidebar context.
 */
export function useActiveSidebarContext(): SidebarContextType {
  const focusedPane = getFocusedSplitPane();
  const { isSplitView } = useSplitView();
  const isSecondaryFocused = !isSplitView && focusedPane === "secondary";

  // Select only the sidebar context, so that callers do not re-render on
  // every navigation.
  return useLocationSelector<
    { sidebarContext?: SidebarContextType },
    SidebarContextType
  >((location) => {
    if (isSecondaryFocused && getSplitPath(location.search)) {
      return location.state?.sidebarContext ?? "collections";
    }
    return location.state?.sidebarContext;
  });
}
