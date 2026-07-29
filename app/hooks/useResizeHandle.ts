import * as React from "react";
import useEventListener from "~/hooks/useEventListener";

/** How far, in pixels, a value can be dragged beyond its bounds. */
const RUBBER_BAND_LIMIT = 100;

/** Resistance applied to the first pixel of overshoot, 0-1. Lower is stiffer. */
const RUBBER_BAND_TENSION = 0.55;

interface Bounds {
  /** Lower bound, below which resistance is applied. */
  min?: number;
  /** Upper bound, above which resistance is applied. */
  max?: number;
  /** How far the value may travel beyond a bound, defaults to 100. */
  limit?: number;
}

interface ResizeHandleOptions extends Bounds {
  /**
   * Maps a mouse event to the raw, unconstrained value being dragged. Return undefined to ignore
   * the event, for example when the element being measured is not yet rendered.
   */
  measure: (event: MouseEvent) => number | undefined;
  /** Called with the constrained value on each frame of the drag. */
  onResize: (value: number) => void;
  /** Called once the drag has ended, typically to settle the value within its bounds. */
  onResizeEnd?: () => void;
}

interface ResizeHandle {
  /** Whether a drag is currently in progress. */
  isResizing: boolean;
  /** Begins a drag, to be called from the mouse down event of the drag handle. */
  startResize: (event: React.MouseEvent) => void;
}

/**
 * Drives a draggable resize handle. Tracks the mouse for the duration of the drag and applies
 * resistance when dragged outside of the given bounds, so that the value can be stretched past
 * them but settles back within them once released.
 *
 * @param options the bounds to resize within, and the callbacks driving the drag.
 * @returns the drag state, and the mouse down handler to attach to the handle.
 */
export function useResizeHandle({
  measure,
  onResize,
  onResizeEnd,
  min,
  max,
  limit,
}: ResizeHandleOptions): ResizeHandle {
  const [isResizing, setResizing] = React.useState(false);

  const handleDrag = React.useCallback(
    (event: MouseEvent) => {
      // suppresses text selection
      event.preventDefault();

      const value = measure(event);
      if (value === undefined) {
        return;
      }

      onResize(rubberBand(value, { min, max, limit }));
    },
    [measure, onResize, min, max, limit]
  );

  const handleStopDrag = React.useCallback(() => {
    setResizing(false);
    onResizeEnd?.();
  }, [onResizeEnd]);

  const startResize = React.useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setResizing(true);
  }, []);

  useEventListener("mousemove", handleDrag, isResizing ? document : null);
  useEventListener("mouseup", handleStopDrag, isResizing ? document : null);
  useEventListener("blur", handleStopDrag, isResizing ? window : null);

  React.useEffect(() => {
    if (!isResizing) {
      return;
    }

    document.body.style.cursor = "col-resize";
    return () => {
      document.body.style.cursor = "";
    };
  }, [isResizing]);

  return { isResizing, startResize };
}

/**
 * Applies resistance to a value that has been dragged outside of the given bounds, so that moving
 * it further becomes progressively harder – as in the iOS rubber band scrolling effect. The value
 * approaches, but never reaches, `limit` pixels beyond the bound.
 *
 * @param value the value to constrain.
 * @param bounds the bounds to apply resistance outside of.
 * @returns the value with resistance applied.
 */
export function rubberBand(
  value: number,
  { min, max, limit = RUBBER_BAND_LIMIT }: Bounds
): number {
  if (max !== undefined && value > max) {
    return max + resistance(value - max, limit);
  }
  if (min !== undefined && value < min) {
    return min - resistance(min - value, limit);
  }
  return value;
}

function resistance(distance: number, limit: number): number {
  return (
    (distance * limit * RUBBER_BAND_TENSION) /
    (limit + RUBBER_BAND_TENSION * distance)
  );
}
