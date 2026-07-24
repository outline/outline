import type { KeyFilter, Options } from "~/hooks/useKeyDown";
import useKeyDown from "~/hooks/useKeyDown";

type Props = {
  trigger: KeyFilter;
  handler: (event: KeyboardEvent) => void;
  /** Require the platform modifier key (Cmd on macOS, Ctrl elsewhere). */
  metaKey?: boolean;
  /** Require the Alt/Option key. */
  altKey?: boolean;
  /** Require the Shift key. */
  shiftKey?: boolean;
  options?: Options;
};

/**
 * This method is a wrapper around the useKeyDown hook to allow easier use in
 * class components that have not yet been converted to functions. Do not use
 * this method in functional components.
 */
export default function RegisterKeyDown({
  trigger,
  handler,
  metaKey,
  altKey,
  shiftKey,
  options,
}: Props) {
  useKeyDown(trigger, handler, {
    ...options,
    metaKey: metaKey ?? options?.metaKey,
    altKey: altKey ?? options?.altKey,
    shiftKey: shiftKey ?? options?.shiftKey,
  });
  return null;
}
