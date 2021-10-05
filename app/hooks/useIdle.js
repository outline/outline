// @flow
import createActivityDetector from "activity-detector";
import * as React from "react";

/**
 * Hook to detect user idle state.
 *
 * @param {number} timeToIdle
 * @returns boolean if the user is idle
 */
export default function useIdle(timeToIdle: number = 60 * 60 * 1000) {
  const [isIdle, setIsIdle] = React.useState(false);

  React.useEffect(() => {
    const detector = createActivityDetector({ timeToIdle });
    detector.on("idle", () => setIsIdle(true));
    detector.on("active", () => setIsIdle(false));
    return () => detector.stop();
  }, [timeToIdle]);

  return isIdle;
}
