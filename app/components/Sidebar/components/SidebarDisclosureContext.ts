import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";

/**
 * Represents a recursive expand/collapse event broadcast through context.
 */
export interface SidebarDisclosureEvent {
  /** Whether descendants should expand or collapse. */
  action: "expand" | "collapse";
  /**
   * Monotonically increasing counter used to detect new events.
   * Each increment represents a distinct user interaction.
   */
  generation: number;
}

/**
 * Context for broadcasting recursive expand/collapse events from a parent
 * (e.g. a collection or document disclosure toggle with alt-click) to all
 * descendant DocumentLinks in the sidebar tree.
 *
 * The nearest provider determines the scope — only descendants within that
 * provider react to the event. Each DocumentLink should both consume and
 * provide this context so that alt-click at any level only affects its subtree.
 */
const SidebarDisclosureContext = createContext<SidebarDisclosureEvent | null>(
  null
);

/**
 * Hook that subscribes to recursive expand/collapse events from an ancestor
 * provider. When a new event is detected, the appropriate callback is invoked.
 *
 * Newly mounted components will also react to the current event, which enables
 * cascading: expanding a parent reveals children, which mount and see the
 * expand event, then expand themselves to reveal grandchildren, and so on.
 *
 * @param onExpand - called when a recursive expand event is received.
 * @param onCollapse - called when a recursive collapse event is received.
 */
export function useSidebarDisclosure(
  onExpand: () => void,
  onCollapse: () => void
): void {
  const event = useContext(SidebarDisclosureContext);
  const lastHandledGeneration = useRef(-1);

  useEffect(() => {
    if (!event || event.generation === lastHandledGeneration.current) {
      return;
    }
    lastHandledGeneration.current = event.generation;

    if (event.action === "expand") {
      onExpand();
    } else {
      onCollapse();
    }
  }, [event, onExpand, onCollapse]);
}

/**
 * Hook for the producing side of the disclosure context. Returns the current
 * event value (to pass to a Provider) and a single callback to handle
 * alt-click expand/collapse broadcasts.
 *
 * This hook also reads the parent context and automatically forwards any
 * incoming disclosure events so that the cascade propagates through the
 * entire tree — even when intermediate nodes each create their own provider.
 *
 * @returns object with `event` to spread onto the Provider's value and
 *   `onDisclosureClick` to call from disclosure click handlers.
 */
export function useSidebarDisclosureState() {
  const parentEvent = useContext(SidebarDisclosureContext);
  const [event, setEvent] = useState<SidebarDisclosureEvent | null>(null);
  const lastForwardedParentGeneration = useRef(-1);

  // Forward parent disclosure events into our own provider value so that
  // grandchildren (and beyond) see the event even though each level creates
  // its own independent provider.
  useEffect(() => {
    if (
      !parentEvent ||
      parentEvent.generation === lastForwardedParentGeneration.current
    ) {
      return;
    }
    lastForwardedParentGeneration.current = parentEvent.generation;
    setEvent((prev) => ({
      action: parentEvent.action,
      generation: (prev?.generation ?? 0) + 1,
    }));
  }, [parentEvent]);

  /**
   * Call from a disclosure click handler after toggling expand/collapse state.
   * When alt is held, broadcasts a recursive expand or collapse event to all
   * descendants. Otherwise, clears any stale event.
   *
   * @param willExpand - whether the node is expanding or collapsing.
   * @param altKey - whether the alt/option key was held during the click.
   */
  const onDisclosureClick = useCallback(
    (willExpand: boolean, altKey: boolean) => {
      if (altKey) {
        setEvent((prev) => ({
          action: willExpand ? "expand" : "collapse",
          generation: (prev?.generation ?? 0) + 1,
        }));
      } else {
        setEvent(null);
      }
    },
    []
  );

  return { event, onDisclosureClick };
}

export default SidebarDisclosureContext;
