import { useCallback, useState } from "react";
import type { FrequencyTracker } from "@shared/utils/FrequencyTracker";

/**
 * Read the most frequent items from a tracker, snapshotted on mount so the
 * order does not shift beneath the user while the component remains open.
 *
 * @param tracker the tracker to read from.
 * @returns the most frequent items and a function to track a use of an item.
 */
export default function useFrequencyTracker<T extends string>(
  tracker: FrequencyTracker<T>
) {
  const [frequent] = useState(() => tracker.frequent);
  const track = useCallback((item: T) => tracker.track(item), [tracker]);

  return { frequent, track };
}
