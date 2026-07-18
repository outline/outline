import type { Location } from "history";
import { createLocation } from "history";
import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import type { SidebarContextType } from "~/components/Sidebar/components/SidebarContext";
import { useSplitView } from "~/components/SplitView/context";
import { getFocusedSplitPane, getSplitPath } from "~/utils/splitView";

/**
 * Returns a synthetic location decoded from the split query parameter while
 * the secondary split view pane has focus, for components rendered outside
 * the panes (such as the sidebar) to determine the active item against.
 *
 * The focused pane is observable, so the calling component must be wrapped
 * in `observer` to update when focus changes.
 *
 * @returns the focused pane's location, or undefined when the primary pane
 * has focus, no split view is open, or the component is rendered inside a
 * pane and the router context already provides the pane's location.
 */
export function useFocusedSplitLocation(): Location | undefined {
  const location = useLocation<{ sidebarContext?: SidebarContextType }>();
  const focusedPane = getFocusedSplitPane();
  const { isSplitView } = useSplitView();

  return useMemo(() => {
    if (isSplitView || focusedPane !== "secondary") {
      return undefined;
    }

    const splitPath = getSplitPath(location.search);
    if (!splitPath) {
      return undefined;
    }

    return createLocation(splitPath, {
      sidebarContext: location.state?.sidebarContext ?? "collections",
    });
  }, [isSplitView, focusedPane, location]);
}
