import * as React from "react";
import usePersistedState from "~/hooks/usePersistedState";
import useStores from "./useStores";

export function usePinnedDocuments(
  urlId: "home" | string,
  collectionId?: string
) {
  const { pins } = useStores();
  const [pinsCacheCount, setPinsCacheCount] = usePersistedState<number>(
    `pins-${urlId}`,
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
