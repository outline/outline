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
  /** Event handler for double-click event on the resize handle. */
  handleDoubleClick: () => void;
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
  /** The pixel increment to snap vertical resizing to. */
  gridHeightSnap?: number;
  /** The minimum height in pixels when resizing vertically. */
  minHeight?: number;
  /** A reference to the element being resized. */
  ref: React.RefObject<HTMLDivElement>;
};

export default function useDragResize(props: Params): ReturnValue {
  const {
    onChangeSize,
    naturalWidth,
    naturalHeight,
    gridSnap,
    gridHeightSnap,
    minHeight,
    ref,
  } = props;

  const [size, setSize] = React.useState<SizeState>({
    width: props.width,
    height: props.height,
  });
  const [maxWidth, setMaxWidth] = React.useState(Infinity);
  const [offset, setOffset] = React.useState(0);
  const [sizeAtDragStart, setSizeAtDragStart] = React.useState(size);
  const [dragging, setDragging] = React.useState<DragDirection>();
  const isResizable = !!onChangeSize;

  // Mirror the latest size into a ref so handlePointerUp can read it without
  // re-binding listeners on every pointermove that updates size.
  const sizeRef = React.useRef(size);
  sizeRef.current = size;

  const constrainWidth = React.useCallback(
    (width: number, max: number) => {
      const minWidth = Math.min(naturalWidth, (gridSnap / 100) * max);
      return Math.round(Math.min(max, Math.max(width, minWidth)));
    },
    [naturalWidth, gridSnap]
  );

  const handlePointerMove = React.useCallback(
    (event: PointerEvent) => {
      event.preventDefault();

      let diffX, diffY;
      if (dragging === "left") {
        diffX = offset - event.pageX;
      } else if (dragging === "right") {
        diffX = event.pageX - offset;
      } else {
        diffY = event.pageY - offset;
      }

      if (diffX && sizeAtDragStart.width) {
        const gridWidth = (gridSnap / 100) * maxWidth;
        const newWidth = sizeAtDragStart.width + diffX * 2;
        const widthOnGrid = Math.round(newWidth / gridWidth) * gridWidth;
        const constrainedWidth = constrainWidth(widthOnGrid, maxWidth);
        const aspectRatio = naturalHeight / naturalWidth;

        setSize({
          width:
            // If the natural width is the same as the constrained width, use the natural width -
            // special case for images resized to the full width of the editor.
            constrainedWidth === Math.min(newWidth, maxWidth)
              ? naturalWidth
              : constrainedWidth,
          height: naturalWidth
            ? Math.round(constrainedWidth * aspectRatio)
            : undefined,
        });
      }

      if (diffY && sizeAtDragStart.height) {
        const gridHeight = gridHeightSnap ?? 10;
        const newHeight = sizeAtDragStart.height + diffY;
        const heightOnGrid = Math.round(newHeight / gridHeight) * gridHeight;

        setSize((state) => ({
          ...state,
          height: Math.max(heightOnGrid, minHeight ?? 50),
        }));
      }
    },
    [
      dragging,
      offset,
      sizeAtDragStart,
      maxWidth,
      gridSnap,
      gridHeightSnap,
      naturalWidth,
      naturalHeight,
      minHeight,
      constrainWidth,
    ]
  );

  const handlePointerUp = React.useCallback(
    (event: PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();

      setOffset(0);
      setDragging(undefined);
      onChangeSize?.(sizeRef.current);
    },
    [onChangeSize]
  );

  const handleKeyDown = React.useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();

        setSize(sizeAtDragStart);
        setDragging(undefined);
      }
    },
    [sizeAtDragStart]
  );

  const handleDoubleClick = () => {
    if (!isResizable) {
      return;
    }

    // Resize to original size
    const newSize = {
      width: naturalWidth,
      height: naturalHeight,
    };
    setSize(newSize);
    onChangeSize?.(newSize);
  };

  const handlePointerDown =
    (dragDirection: DragDirection) =>
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      // Calculate constraints once at the start of dragging as it's relatively expensive operation
      const max = ref.current
        ? parseInt(
            getComputedStyle(ref.current).getPropertyValue("--document-width")
          ) -
          EditorStyleHelper.padding * 2
        : Infinity;
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
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp);
    }

    return () => {
      document.body.style.cursor = "initial";
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, [
    dragging,
    handleKeyDown,
    handlePointerMove,
    handlePointerUp,
    isResizable,
  ]);

  return {
    handlePointerDown,
    handleDoubleClick,
    dragging: !!dragging,
    setSize,
    width: size.width,
    height: size.height,
  };
}
