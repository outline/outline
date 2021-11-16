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
  const timeout = React.useRef();
  const onActivity = React.useCallback(() => {
    if (timeout.current) {
      clearTimeout(timeout.current);
    }

    // @ts-expect-error ts-migrate(2322) FIXME: Type 'Timeout' is not assignable to type 'undefine... Remove this comment to see the full error message
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
