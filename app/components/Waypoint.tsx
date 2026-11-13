import useWaypoint from "~/hooks/useWaypoint";

interface Props {
  /** Function to call when the waypoint enters the viewport. */
  onEnter?: () => void;
  /** Margin around the viewport in CSS margin syntax, e.g. "0px 0px 200px 0px". */
  rootMargin?: string;
}

/**
 * Renders an empty element that calls onEnter when it enters the viewport. To
 * check again after the content changes, remount it with a new key.
 *
 * @param props - the component props.
 * @returns the waypoint element.
 */
export function Waypoint({ onEnter, rootMargin }: Props) {
  const ref = useWaypoint(onEnter, { rootMargin });
  return <div ref={ref} aria-hidden />;
}
