import { ForesightManager } from "js.foresight";
import * as React from "react";
import { Second } from "@shared/utils/time";
import useUnmount from "./useUnmount";

interface Options {
  /** Milliseconds the cursor must hover before intent fires, defaults to 100. */
  delay?: number;
  /**
   * Also fire when the cursor moves towards the element, or keyboard focus is
   * about to reach it. Use only for a small number of elements.
   */
  predict?: boolean;
}

/**
 * Hook to call a callback when the user is likely to click an element, used
 * to preload data or code. Intent fires after the cursor hovers the element for
 * a delay. With the predict option, it also fires when the cursor moves towards
 * the element; attach the returned ref for this.
 *
 * @param onClickIntent callback to call when click intent is detected.
 * @param options optional configuration.
 * @returns mouse handlers and a ref to attach to the element.
 */
export default function useClickIntent(
  onClickIntent?: () => void,
  { delay = 100, predict = false }: Options = {}
) {
  const timer = React.useRef<number | undefined>(undefined);
  const callbackRef = React.useRef(onClickIntent);
  const [element, setElement] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    callbackRef.current = onClickIntent;
  }, [onClickIntent]);

  React.useEffect(() => {
    if (!predict || !element) {
      return;
    }

    const manager = ForesightManager.initialize({ setDataAttributes: false });
    const { unregister } = manager.register({
      element,
      callback: () => callbackRef.current?.(),
      reactivateAfter: 5 * Second.ms,
    });

    return unregister;
  }, [predict, element]);

  const handleMouseEnter = React.useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }

    if (onClickIntent) {
      timer.current = window.setTimeout(onClickIntent, delay);
    }
  }, [onClickIntent, delay]);

  const handleMouseLeave = React.useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
  }, []);

  useUnmount(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
  });

  return { ref: setElement, handleMouseEnter, handleMouseLeave };
}
