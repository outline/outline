import type { SidebarContextType } from "../components/Sidebar/components/SidebarContext";
import { useLocationSelector } from "./useLocationSelector";

/**
 * Hook to retrieve the sidebar context from the current location state.
 *
 * @returns the sidebar context of the current location, if any.
 */
export function useLocationSidebarContext() {
  return useLocationSelector<
    { sidebarContext?: SidebarContextType },
    SidebarContextType | undefined
  >((location) => location.state?.sidebarContext);
}
