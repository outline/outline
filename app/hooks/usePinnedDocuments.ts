import { useCallback, useEffect } from "react";
import usePersistedState from "~/hooks/usePersistedState";
import useStores from "./useStores";

type UrlId = string;

export const pinsCacheKey = (urlId: UrlId) => `pins-${urlId}`;

export function usePinnedDocuments(urlId: UrlId, collectionId?: string) {
  const { pins } = useStores();
  const [pinsCacheCount, setPinsCacheCount] = usePersistedState<number>(
    pinsCacheKey(urlId),
    0
  );

  const getPins = useCallback(
    () =>
      urlId === "home"
        ? pins.home
        : collectionId
          ? pins.inCollection(collectionId)
          : [],
    [urlId, collectionId, pins]
  );

  useEffect(() => {
    void pins
      .fetchPage(urlId === "home" ? undefined : { collectionId })
      .then(() => {
        setPinsCacheCount(getPins().length);
      });
  }, [urlId, collectionId, pins, getPins, setPinsCacheCount]);

  return {
    count: pinsCacheCount,
    pins: getPins(),
  };
}
