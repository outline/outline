import type { Location } from "history";
import { createLocation } from "history";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import type { SidebarContextType } from "~/components/Sidebar/components/SidebarContext";
import { useSplitView } from "~/components/SplitView/context";
import type { SplitViewPane } from "~/utils/splitView";
import {
  getFocusedSplitPane,
  getSplitPath,
  observeFocusedSplitPane,
} from "~/utils/splitView";

/**
 * Returns the pane of the split view that currently has focus, updating as
 * focus moves between panes.
 *
 * @returns the focused pane.
 */
export function useFocusedSplitPane(): SplitViewPane {
  const [pane, setPane] = useState(getFocusedSplitPane());
  useEffect(() => observeFocusedSplitPane(setPane), []);
  return pane;
}

/**
 * Returns a synthetic location decoded from the split query parameter while
 * the secondary split view pane has focus, for components rendered outside
 * the panes (such as the sidebar) to determine the active item against.
 *
 * @returns the focused pane's location, or undefined when the primary pane
 * has focus, no split view is open, or the component is rendered inside a
 * pane and the router context already provides the pane's location.
 */
export function useFocusedSplitLocation(): Location | undefined {
  const location = useLocation<{ sidebarContext?: SidebarContextType }>();
  const focusedPane = useFocusedSplitPane();
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
