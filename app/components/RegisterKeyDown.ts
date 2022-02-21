import useKeyDown, { KeyFilter, Options } from "~/hooks/useKeyDown";

type Props = {
  trigger: KeyFilter;
  handler: (event: KeyboardEvent) => void;
  options?: Options;
};

/**
 * This method is a wrapper around the useKeyDown hook to allow easier use in
 * class components that have not yet been converted to functions. Do not use
 * this method in functional components.
 */
export default function RegisterKeyDown({ trigger, handler, options }: Props) {
  useKeyDown(trigger, handler, options);
  return null;
}
