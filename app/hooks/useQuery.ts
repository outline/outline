import { useMemo } from "react";
import { useLocation } from "react-router-dom";

/**
 * Hook to access URL query parameters from the current location.
 *
 * @returns URLSearchParams object containing the current URL query parameters
 */
export default function useQuery() {
  const location = useLocation();

  const query = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  return query;
}
