import * as React from "react";
import usePersistedState from "~/hooks/usePersistedState";

export default function useLastVisitedPath() {
  const [lastVisitedPath, setLastVisitedPath] = usePersistedState(
    "lastVisitedPath",
    "/"
  );

  const setPathAsLastVisitedPath = React.useCallback(
    (path: string) => {
      path !== lastVisitedPath && setLastVisitedPath(path);
    },
    [lastVisitedPath, setLastVisitedPath]
  );

  return [lastVisitedPath, setPathAsLastVisitedPath];
}
