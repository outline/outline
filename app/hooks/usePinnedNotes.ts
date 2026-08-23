import { useCallback, useEffect } from "react";
import usePersistedState from "~/hooks/usePersistedState";
import useStores from "./useStores";
type UrlId = string;
export const pinsCacheKey = (urlId: UrlId) => `pins-${urlId}`;
export function usePinnedNotes(urlId: UrlId, notebookId?: string) {
  const { pins } = useStores();
  const [pinsCacheCount, setPinsCacheCount] = usePersistedState<number>(
    pinsCacheKey(urlId),
    0
  );
  const getPins = useCallback(
    () =>
      urlId === "home"
        ? pins.home
        : notebookId
          ? pins.inNotebook(notebookId)
          : [],
    [urlId, notebookId, pins]
  );
  useEffect(() => {
    void pins
      .fetchPage(urlId === "home" ? undefined : { notebookId })
      .then(() => {
        setPinsCacheCount(getPins().length);
      });
  }, [urlId, notebookId, pins, getPins, setPinsCacheCount]);
  return {
    count: pinsCacheCount,
    pins: getPins(),
  };
}
