import { useLocation } from "react-router-dom";
import {
  normalizeSidebarContext,
  type SidebarContextType,
} from "../components/Sidebar/components/SidebarContext";
/**
 * Hook to retrieve the sidebar context from the current location state.
 */
export function useLocationSidebarContext() {
  const location = useLocation<{
    sidebarContext?: SidebarContextType;
  }>();
  return normalizeSidebarContext(location.state?.sidebarContext);
}
