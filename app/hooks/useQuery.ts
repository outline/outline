import { useMemo } from "react";
import { useLocationSelector } from "./useLocationSelector";

/**
 * Hook to access URL query parameters from the current location.
 *
 * @returns URLSearchParams object containing the current URL query parameters
 */
export default function useQuery() {
  const search = useLocationSelector((location) => location.search);

  const query = useMemo(() => new URLSearchParams(search), [search]);

  return query;
}
