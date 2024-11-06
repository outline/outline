import * as React from "react";
import useEventListener from "./useEventListener";

/**
 * Hook to detect clicks outside of a specified element.
 *
 * @param ref The React ref to the element.
 * @param callback The handler to call when a click outside the element is detected.
 */
export default function useOnClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  callback?: (event: MouseEvent | TouchEvent) => void,
  options: AddEventListenerOptions = {}
) {
  const listener = React.useCallback(
    (event: MouseEvent | TouchEvent) => {
      // Do nothing if clicking ref's element or descendent elements
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      callback?.(event);
    },
    [ref, callback]
  );

  useEventListener("pointerdown", listener, window, options);
  useEventListener("touchstart", listener, window, options);
}
