import * as React from "react";
import { getCookie, removeCookie, setCookie } from "tiny-cookie";
import usePersistedState from "~/hooks/usePersistedState";
import Logger from "~/utils/Logger";
import history from "~/utils/history";
import { isValidPostLoginRedirect } from "~/utils/urls";

/**
 * Hook to set locally and return the document or collection that the user last visited. This is
 * used to redirect the user back to the last page they were on, if preferred.
 *
 * @returns A tuple of the last visited path and a method to set it.
 */
export function useLastVisitedPath(): [string, (path: string) => void] {
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

  return [lastVisitedPath, setPathAsLastVisitedPath] as const;
}

/**
 * Sets the path that the user visited before being asked to login.
 *
 * @param path The path to set as the post login path.
 */
export function setPostLoginPath(path: string) {
  if (isValidPostLoginRedirect(path)) {
    setCookie("postLoginRedirectPath", path, { expires: 1 });
  }
}

/**
 * Hook to set locally and return the path that the user visited before being asked
 * to login.
 *
 * @returns A tuple of getter and setter for the post login path.
 */
export function usePostLoginPath() {
  const key = "postLoginRedirectPath";

  const getter = React.useCallback(() => {
    const path = getCookie(key);

    if (path) {
      Logger.info("lifecycle", "Spending post login path", { path });

      // Remove the cookie once the app has been navigated to the post login path. We dont
      // do this immediately as React StrictMode will render multiple times.
      const cleanup = history.listen(() => {
        removeCookie(key);
        cleanup?.();
      });

      if (isValidPostLoginRedirect(path)) {
        return path;
      }
    }

    return undefined;
  }, []);

  return [getter, setPostLoginPath] as const;
}
