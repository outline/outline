import throttle from "lodash/throttle";
import * as React from "react";
import { Minute } from "@shared/utils/time";

const activityEvents = [
  "click",
  "mousemove",
  "keydown",
  "DOMMouseScroll",
  "mousewheel",
  "mousedown",
  "touchstart",
  "touchmove",
  "focus",
];

/**
 * Hook to detect user idle state.
 *
 * @param {number} timeToIdle
 * @returns boolean if the user is idle
 */
export default function useIdle(timeToIdle: number = 3 * Minute) {
  const [isIdle, setIsIdle] = React.useState(false);
  const timeout = React.useRef<ReturnType<typeof setTimeout>>();

  const onActivity = React.useCallback(() => {
    if (timeout.current) {
      clearTimeout(timeout.current);
    }

    timeout.current = setTimeout(() => {
      setIsIdle(true);
    }, timeToIdle);
  }, [timeToIdle]);

  React.useEffect(() => {
    const handleUserActivityEvent = throttle(() => {
      setIsIdle(false);
      onActivity();
    }, 1000);

    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, handleUserActivityEvent)
    );
    return () => {
      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, handleUserActivityEvent)
      );
    };
  }, [onActivity]);

  return isIdle;
}
