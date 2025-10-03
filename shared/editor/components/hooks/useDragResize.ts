import * as React from "react";
import { EditorStyleHelper } from "../../styles/EditorStyleHelper";

type DragDirection = "left" | "right" | "bottom";

type SizeState = { width: number; height?: number };

/**
 * Hook for resizing an element by dragging its sides.
 */
type ReturnValue = {
  /** Event handler for pointer down event on the resize handle. */
  handlePointerDown: (
    dragging: DragDirection
  ) => (event: React.PointerEvent<HTMLDivElement>) => void;
  /** Handler to set the new size of the element from outside. */
  setSize: React.Dispatch<React.SetStateAction<SizeState>>;
  /** Whether the element is currently being resized. */
  dragging: boolean;
  /** The current width of the element. */
  width: number;
  /** The current height of the element. */
  height?: number;
};

type Params = {
  /** Callback triggered when the image is resized */
  onChangeSize?: undefined | ((size: SizeState) => void);
  /** The initial width of the element. */
  width: number;
  /** The initial height of the element. */
  height: number;
  /** The natural width of the element. */
  naturalWidth: number;
  /** The natural height of the element. */
  naturalHeight: number;
  /** The percentage of the grid to snap the element to. */
  gridSnap: 5;
  /** A reference to the element being resized. */
  ref: React.RefObject<HTMLDivElement>;
};

export default function useDragResize(props: Params): ReturnValue {
  const [size, setSize] = React.useState<SizeState>({
    width: props.width,
    height: props.height,
  });
  const [maxWidth, setMaxWidth] = React.useState(Infinity);
  const [offset, setOffset] = React.useState(0);
  const [sizeAtDragStart, setSizeAtDragStart] = React.useState(size);
  const [dragging, setDragging] = React.useState<DragDirection>();
  const isResizable = !!props.onChangeSize;

  // Use ref for callback to avoid recreating handlers when callback changes
  const onChangeSizeRef = React.useRef(props.onChangeSize);
  React.useEffect(() => {
    onChangeSizeRef.current = props.onChangeSize;
  }, [props.onChangeSize]);

  // Use refs to keep current values accessible without recreating callbacks
  const sizeRef = React.useRef(size);
  const draggingRef = React.useRef(dragging);
  const offsetRef = React.useRef(offset);
  const sizeAtDragStartRef = React.useRef(sizeAtDragStart);
  const maxWidthRef = React.useRef(maxWidth);

  // Store props in refs to make callbacks stable
  const gridSnapRef = React.useRef(props.gridSnap);
  const naturalWidthRef = React.useRef(props.naturalWidth);
  const naturalHeightRef = React.useRef(props.naturalHeight);

  React.useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  React.useEffect(() => {
    draggingRef.current = dragging;
  }, [dragging]);

  React.useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  React.useEffect(() => {
    sizeAtDragStartRef.current = sizeAtDragStart;
  }, [sizeAtDragStart]);

  React.useEffect(() => {
    maxWidthRef.current = maxWidth;
  }, [maxWidth]);

  React.useEffect(() => {
    gridSnapRef.current = props.gridSnap;
  }, [props.gridSnap]);

  React.useEffect(() => {
    naturalWidthRef.current = props.naturalWidth;
  }, [props.naturalWidth]);

  React.useEffect(() => {
    naturalHeightRef.current = props.naturalHeight;
  }, [props.naturalHeight]);

  const constrainWidth = React.useCallback(
    (width: number, max: number) => {
      const minWidth = Math.min(naturalWidthRef.current, (gridSnapRef.current / 100) * max);
      return Math.round(Math.min(max, Math.max(width, minWidth)));
    },
    []
  );

  // Create stable event listener functions that use refs
  const handlePointerMoveStable = React.useCallback(
    (event: PointerEvent) => {
      event.preventDefault();

      const currentDragging = draggingRef.current;
      const currentOffset = offsetRef.current;
      const currentSizeAtDragStart = sizeAtDragStartRef.current;
      const currentMaxWidth = maxWidthRef.current;

      let diffX, diffY;
      if (currentDragging === "left") {
        diffX = currentOffset - event.pageX;
      } else if (currentDragging === "right") {
        diffX = event.pageX - currentOffset;
      } else {
        diffY = event.pageY - currentOffset;
      }

      if (diffX && currentSizeAtDragStart.width) {
        const gridWidth = (gridSnapRef.current / 100) * currentMaxWidth;
        const newWidth = currentSizeAtDragStart.width + diffX * 2;
        const widthOnGrid = Math.round(newWidth / gridWidth) * gridWidth;
        const constrainedWidth = constrainWidth(widthOnGrid, currentMaxWidth);
        const aspectRatio = naturalHeightRef.current / naturalWidthRef.current;

        setSize({
          width:
            // If the natural width is the same as the constrained width, use the natural width -
            // special case for images resized to the full width of the editor.
            constrainedWidth === Math.min(newWidth, currentMaxWidth)
              ? naturalWidthRef.current
              : constrainedWidth,
          height: naturalWidthRef.current
            ? Math.round(constrainedWidth * aspectRatio)
            : undefined,
        });
      }

      if (diffY && currentSizeAtDragStart.height) {
        // For height resizing, use a fixed grid size (50px) instead of percentage-based
        const gridHeight = 50;
        const newHeight = currentSizeAtDragStart.height + diffY;
        const heightOnGrid = Math.round(newHeight / gridHeight) * gridHeight;

        setSize((state) => ({
          ...state,
          height: Math.max(heightOnGrid, 200), // Minimum height of 200px
        }));
      }
    },
    [constrainWidth]
  );

  const handlePointerUpStable = React.useCallback(
    (event: PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const currentSize = sizeRef.current;

      setOffset(0);
      setDragging(undefined);

      // Defer ProseMirror transaction until after React render cycle completes
      requestAnimationFrame(() => {
        onChangeSizeRef.current?.(currentSize);
      });

      // Event listeners are removed by useEffect cleanup when dragging becomes undefined
    },
    []
  );

  const handleKeyDownStable = React.useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();

        const currentSizeAtDragStart = sizeAtDragStartRef.current;
        setSize(currentSizeAtDragStart);
        setDragging(undefined);
      }
    },
    []
  );

  const handlePointerDown =
    (dragDirection: DragDirection) =>
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      // Calculate constraints once at the start of dragging as it's relatively expensive operation
      let max = Infinity;
      if (props.ref.current) {
        const docWidth = parseInt(
          getComputedStyle(props.ref.current).getPropertyValue(
            "--document-width"
          )
        );
        // Fallback to actual container width if --document-width is not available
        max = !isNaN(docWidth)
          ? docWidth - EditorStyleHelper.padding * 2
          : props.ref.current.clientWidth;
      }
      setMaxWidth(max);
      setSizeAtDragStart({
        width: constrainWidth(size.width, max),
        height: size.height,
      });
      setOffset(
        dragDirection === "left" || dragDirection === "right"
          ? event.pageX
          : event.pageY
      );
      setDragging(dragDirection);
    };

  React.useEffect(() => {
    if (!isResizable) {
      return;
    }

    if (dragging) {
      document.body.style.cursor =
        dragging === "left" || dragging === "right" ? "ew-resize" : "ns-resize";
      document.addEventListener("keydown", handleKeyDownStable);
      document.addEventListener("pointermove", handlePointerMoveStable);
      document.addEventListener("pointerup", handlePointerUpStable);
    }

    return () => {
      document.body.style.cursor = "initial";
      document.removeEventListener("keydown", handleKeyDownStable);
      document.removeEventListener("pointermove", handlePointerMoveStable);
      document.removeEventListener("pointerup", handlePointerUpStable);
    };
  }, [dragging, isResizable, handleKeyDownStable, handlePointerMoveStable, handlePointerUpStable]);

  return {
    handlePointerDown,
    dragging: !!dragging,
    setSize,
    width: size.width,
    height: size.height,
  };
}
