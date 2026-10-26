import { useEffect } from "react";
import type { RefObject } from "react";

interface Options {
  /** Whether the panel is open and can be swiped away. */
  enabled: boolean;
  /** The screen edge that the panel is attached to. */
  side: "left" | "right";
  /** Called when a swipe passes the dismiss threshold. */
  onDismiss: () => void;
}

/** Distance in pixels a pointer must move before the gesture is a drag or a scroll. */
const DragSlop = 8;

/** Release speed in px/ms above which the panel is dismissed, matches vaul. */
const VelocityThreshold = 0.4;

/** Fraction of the panel width past which the panel is dismissed, matches vaul. */
const CloseThreshold = 0.25;

/** Rubber band resistance for a drag away from the edge, matches vaul. */
const dampen = (value: number) => Math.max(8 * (Math.log(value + 1) - 2), 0);

/**
 * Lets the user drag an edge-attached panel toward its edge to dismiss it, with
 * the same thresholds as the vaul drawer. The panel follows the pointer, and on
 * release it either dismisses or springs back using the CSS transition of the
 * panel. A vertical gesture is left to the browser so that the panel can scroll.
 *
 * @param panelRef ref to the panel element that moves.
 * @param overlayRef ref to an optional backdrop that fades as the panel moves.
 * @param options the swipe options.
 */
export function useSwipeToDismiss(
  panelRef: RefObject<HTMLElement | null>,
  overlayRef: RefObject<HTMLElement | null>,
  { enabled, side, onDismiss }: Options
) {
  useEffect(() => {
    const panel = panelRef.current;
    if (!enabled || !panel) {
      return;
    }
    const overlay = overlayRef.current;
    const sign = side === "left" ? -1 : 1;

    let start: { x: number; y: number; time: number } | null = null;
    let isDragging = false;
    let width = 0;
    let distance = 0;

    const setStyles = (
      transition: string,
      transform: string,
      opacity: string
    ) => {
      panel.style.transition = transition;
      panel.style.transform = transform;
      if (overlay) {
        overlay.style.transition = transition;
        overlay.style.opacity = opacity;
      }
    };

    const suppressClick = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) {
        return;
      }
      start = { x: event.clientX, y: event.clientY, time: event.timeStamp };
      isDragging = false;
      distance = 0;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!start || !event.isPrimary) {
        return;
      }
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;

      if (!isDragging) {
        if (Math.abs(dx) < DragSlop && Math.abs(dy) < DragSlop) {
          return;
        }

        // A mostly vertical gesture is a scroll, so leave it to the browser.
        if (Math.abs(dy) >= Math.abs(dx)) {
          start = null;
          return;
        }
        isDragging = true;
        width = panel.getBoundingClientRect().width;
        panel.setPointerCapture(event.pointerId);
      }

      // A drag away from the edge stretches with resistance. Whole pixels
      // stop a visible line where the panel meets its fill.
      const dragged = dx * sign;
      distance = Math.round(
        dragged >= 0 ? Math.min(dragged, width) : -dampen(-dragged)
      );
      setStyles(
        "none",
        `translateX(${distance * sign}px)`,
        String(1 - Math.max(distance, 0) / width)
      );
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (!event.isPrimary) {
        return;
      }
      if (!start || !isDragging) {
        start = null;
        return;
      }
      const velocity =
        Math.abs(event.clientX - start.x) /
        Math.max(event.timeStamp - start.time, 1);
      start = null;
      isDragging = false;

      // The pointer moved, so the click that follows is not a tap.
      panel.addEventListener("click", suppressClick, {
        capture: true,
        once: true,
      });
      setTimeout(() => {
        panel.removeEventListener("click", suppressClick, { capture: true });
      }, 0);

      if (
        distance > 0 &&
        (velocity > VelocityThreshold || distance >= width * CloseThreshold)
      ) {
        // Hold the closed position until the closed styles apply, then the
        // cleanup below removes the inline styles.
        setStyles("", `translateX(${sign * 100}%)`, "0");
        onDismiss();
        return;
      }
      setStyles("", "", "");
    };

    const handlePointerCancel = (event: PointerEvent) => {
      if (!event.isPrimary) {
        return;
      }
      if (isDragging) {
        setStyles("", "", "");
      }
      start = null;
      isDragging = false;
    };

    panel.addEventListener("pointerdown", handlePointerDown);
    panel.addEventListener("pointermove", handlePointerMove);
    panel.addEventListener("pointerup", handlePointerUp);
    panel.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      panel.removeEventListener("pointerdown", handlePointerDown);
      panel.removeEventListener("pointermove", handlePointerMove);
      panel.removeEventListener("pointerup", handlePointerUp);
      panel.removeEventListener("pointercancel", handlePointerCancel);
      setStyles("", "", "");
    };
  }, [panelRef, overlayRef, enabled, side, onDismiss]);
}
