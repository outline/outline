import * as React from "react";
import usePersistedState from "~/hooks/usePersistedState";
import useStores from "./useStores";

type UrlId = "home" | string;

export const pinsCacheKey = (urlId: UrlId) => `pins-${urlId}`;

export function usePinnedDocuments(urlId: UrlId, collectionId?: string) {
  const { pins } = useStores();
  const [pinsCacheCount, setPinsCacheCount] = usePersistedState<number>(
    pinsCacheKey(urlId),
    0
  );

  function getPins() {
    return urlId === "home"
      ? pins.home
      : collectionId
      ? pins.inCollection(collectionId)
      : [];
  }

  React.useEffect(() => {
    void pins
      .fetchPage(urlId === "home" ? undefined : { collectionId })
      .then(() => {
        setPinsCacheCount(getPins().length);
      });
  }, [collectionId, pins]);

  return {
    count: pinsCacheCount,
    pins: getPins(),
  };
}
