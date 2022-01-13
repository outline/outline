import * as React from "react";

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
export default function useIdle(timeToIdle: number = 3 * 60 * 1000) {
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
    const handleUserActivityEvent = () => {
      setIsIdle(false);
      onActivity();
    };

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
