import * as React from "react";
import { useDragLayer } from "react-dnd";

const DraggedItemContext = React.createContext<string | undefined>(undefined);

const SidebarScrollContext = React.createContext<HTMLElement | null>(null);

/**
 * Provides the sidebar's scroll container so descendants can virtualize their
 * content against it.
 */
export const SidebarScrollProvider = SidebarScrollContext.Provider;

/**
 * Returns the sidebar scroll container element, or null if not within a
 * SidebarScrollProvider.
 */
export function useSidebarScrollElement(): HTMLElement | null {
  return React.useContext(SidebarScrollContext);
}

/**
 * Subscribes once to react-dnd's drag state and exposes the id of the dragged
 * item via context.
 *
 * Virtualized sidebar trees read this to keep the dragged row mounted for the
 * duration of a drag, as react-dnd ends a drag whose source leaves the DOM.
 */
export function DragActiveProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isDragging, itemId } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
    itemId: monitor.isDragging()
      ? monitor.getItem<{ id?: string } | null>()?.id
      : undefined,
  }));

  // Expose drag state to CSS so per-row UI (e.g. the hover actions slot) can
  // be hidden for the duration of a drag without re-rendering
  React.useEffect(() => {
    document.body.toggleAttribute("data-drag-active", isDragging);
    return () => document.body.removeAttribute("data-drag-active");
  }, [isDragging]);

  return (
    <DraggedItemContext.Provider value={itemId}>
      {children}
    </DraggedItemContext.Provider>
  );
}

/**
 * Returns the id of the item being dragged, or undefined when no drag is in
 * progress.
 */
export function useDraggedItemId(): string | undefined {
  return React.useContext(DraggedItemContext);
}
