import { useLocation } from "react-router-dom";
import { SidebarContextType } from "../components/SidebarContext";

/**
 * Hook to retrieve the sidebar context from the current location state.
 */
export function useLocationState() {
  const location = useLocation<{
    sidebarContext?: SidebarContextType;
  }>();
  return location.state?.sidebarContext;
}
