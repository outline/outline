import usePersistedState from "~/hooks/usePersistedState";

export default function useLastVisitedPath() {
  const [lastVisitedPath, setLastVisitedPath] = usePersistedState(
    "lastVisitedPath",
    "/"
  );

  const setPathAsLastVisitedPath = (path: string) => {
    path !== lastVisitedPath && setLastVisitedPath(path);
  };

  return [lastVisitedPath, setPathAsLastVisitedPath];
}
