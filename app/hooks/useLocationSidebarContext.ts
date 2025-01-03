import { useLocation } from "react-router-dom";
import { SidebarContextType } from "../components/Sidebar/components/SidebarContext";

/**
 * Hook to retrieve the sidebar context from the current location state.
 */
export function useLocationSidebarContext() {
  const location = useLocation<{
    sidebarContext?: SidebarContextType;
  }>();
  return location.state?.sidebarContext;
}
