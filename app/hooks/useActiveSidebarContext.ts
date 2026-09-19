import type { SidebarContextType } from "~/components/Sidebar/components/SidebarContext";
import { useFocusedSplitLocation } from "./useFocusedSplitLocation";
import { useLocationSidebarContext } from "./useLocationSidebarContext";

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
  const locationSidebarContext = useLocationSidebarContext();
  const splitLocation = useFocusedSplitLocation();

  if (splitLocation) {
    return splitLocation.state?.sidebarContext;
  }

  return locationSidebarContext;
}
