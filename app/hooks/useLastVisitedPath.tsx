import * as React from "react";
import usePersistedState from "~/hooks/usePersistedState";

/**
 * Hook to set locally and return the path that the user last visited. This is
 * used to redirect the user back to the last page they were on if preferred.
 *
 * @returns A tuple of the last visited path and a method to set it.
 */
export default function useLastVisitedPath(): [string, (path: string) => void] {
  const [lastVisitedPath, setLastVisitedPath] = usePersistedState<string>(
    "lastVisitedPath",
    "/",
    { listen: false }
  );

  const setPathAsLastVisitedPath = React.useCallback(
    (path: string) => {
      path !== lastVisitedPath && setLastVisitedPath(path);
    },
    [lastVisitedPath, setLastVisitedPath]
  );

  return [lastVisitedPath, setPathAsLastVisitedPath];
}
