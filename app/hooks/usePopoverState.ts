import { useState, useCallback } from "react";

/**
 * A compatibility hook that provides a similar API to reakit's usePopoverState
 * but works with our Radix-based Popover component.
 */
export function usePopoverState(options?: {
  gutter?: number;
  placement?: string;
  visible?: boolean;
}) {
  const [visible, setVisible] = useState(options?.visible ?? false);

  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);
  const toggle = useCallback(() => setVisible((prev) => !prev), []);

  return {
    visible,
    show,
    hide,
    toggle,
    // For backward compatibility with existing code
    placement: options?.placement,
    gutter: options?.gutter,
  };
}

export default usePopoverState;
