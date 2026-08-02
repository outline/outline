import { useCallback, useEffect, useMemo, useState } from "react";
import type { FrequencyTracker } from "@shared/utils/FrequencyTracker";

/**
 * Subscribe to a frequency tracker, re-rendering when its items change.
 *
 * @param tracker the tracker to subscribe to.
 * @returns the most frequent items and a function to track a use of an item.
 */
export default function useFrequencyTracker<T extends string>(
  tracker: FrequencyTracker<T>
) {
  const [version, setVersion] = useState(tracker.getVersion);

  useEffect(() => {
    const handleChange = () => setVersion(tracker.getVersion());
    handleChange();
    return tracker.subscribe(handleChange);
  }, [tracker]);

  const frequent = useMemo(
    () => tracker.frequent,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- version invalidates
    [tracker, version]
  );

  const track = useCallback((item: T) => tracker.track(item), [tracker]);

  return { frequent, track };
}
