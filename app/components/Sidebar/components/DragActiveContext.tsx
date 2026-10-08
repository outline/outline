import * as React from "react";
import { useDragLayer } from "react-dnd";

const DragActiveContext = React.createContext(false);

const SidebarScrollContext = React.createContext<HTMLElement | null>(null);

/**
 * Provides the sidebar's scroll container so descendants can use it as the
 * IntersectionObserver root when deciding whether to render heavy content.
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
 * Subscribes once to react-dnd's drag state and exposes a boolean via context.
 *
 * Visibility-gated sidebar rows read this to keep their inner content mounted
 * for the duration of a drag, so that scrolling away from the dragged source
 * (or a drop target the user is heading toward) does not unmount it mid-drag.
 */
export function DragActiveProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const isDragging = useDragLayer((monitor) => monitor.isDragging());

  // Expose drag state to CSS so per-row UI (e.g. the hover actions slot) can
  // be hidden for the duration of a drag without re-rendering
  React.useEffect(() => {
    document.body.toggleAttribute("data-drag-active", isDragging);
    return () => document.body.removeAttribute("data-drag-active");
  }, [isDragging]);

  return (
    <DragActiveContext.Provider value={isDragging}>
      {children}
    </DragActiveContext.Provider>
  );
}

/**
 * Returns whether any react-dnd drag is currently active.
 */
export function useIsDragActive(): boolean {
  return React.useContext(DragActiveContext);
}
