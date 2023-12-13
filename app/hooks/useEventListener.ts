import * as React from "react";

/**
 * Helper to remove plumbing involved with adding and removing an event listener
 * in components.
 *
 * @param eventName The name of the event to listen to.
 * @param handler The handler to call when the event is triggered.
 * @param element The element to attach the event listener to.
 * @param options The options to pass to the event listener.
 */
export default function useEventListener<T extends EventListener>(
  eventName: string,
  handler: T,
  element: Window | VisualViewport | Node | null = window,
  options: AddEventListenerOptions = {}
) {
  const savedHandler = React.useRef<T>();
  const { capture, passive, once } = options;

  React.useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  React.useEffect(() => {
    const isSupported = element && element.addEventListener;
    if (!isSupported) {
      return;
    }

    const eventListener: EventListener = (event) =>
      savedHandler.current?.(event);

    const opts = { capture, passive, once };
    element.addEventListener(eventName, eventListener, opts);
    return () => element.removeEventListener(eventName, eventListener, opts);
  }, [eventName, element, capture, passive, once]);
}
