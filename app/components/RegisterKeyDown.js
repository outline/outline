// @flow
import useKeyDown, { type KeyFilter } from "hooks/useKeyDown";

type Props = {
  trigger: KeyFilter,
  handler: (event: KeyboardEvent) => void,
};

/**
 * This method is a wrapper around the useKeyDown hook to allow easier use in
 * class components that have not yet been converted to functions. Do not use
 * this method in functional components.
 */
export default function RegisterKeyDown({ trigger, handler }: Props) {
  useKeyDown(trigger, handler);
  return null;
}
