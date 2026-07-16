import { useLocation } from "react-router-dom";

/**
 * Hook to retrieve the sidebar context from the current location state.
 */
export function useLocationSidebarContext() {
  const location = useLocation();
  return location.state?.sidebarContext;
}
