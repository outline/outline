import throttle from "lodash/throttle";
import { useState, useRef, useCallback, useEffect } from "react";
import { Minute } from "@shared/utils/time";
import useIsMounted from "./useIsMounted";

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
 * @param timeToIdle The time in ms until idle
 * @param events The events to listen to
 * @returns boolean if the user is idle
 */
export default function useIdle(
  timeToIdle: number = 3 * Minute.ms,
  events = activityEvents
) {
  const isMounted = useIsMounted();
  const [isIdle, setIsIdle] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  const onActivity = useCallback(() => {
    if (timeout.current) {
      clearTimeout(timeout.current);
    }

    timeout.current = setTimeout(() => {
      if (isMounted()) {
        setIsIdle(true);
      }
    }, timeToIdle);
  }, [isMounted, timeToIdle]);

  useEffect(() => {
    const handleUserActivityEvent = throttle(() => {
      if (isMounted()) {
        setIsIdle(false);
        onActivity();
      }
    }, 1000);

    events.forEach((eventName) =>
      window.addEventListener(eventName, handleUserActivityEvent)
    );
    return () => {
      events.forEach((eventName) =>
        window.removeEventListener(eventName, handleUserActivityEvent)
      );
    };
  }, [events, isMounted, onActivity]);

  return isIdle;
}
