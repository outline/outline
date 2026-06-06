import * as React from "react";
import { EditorStyleHelper } from "../../styles/EditorStyleHelper";

type DragDirection = "left" | "right" | "bottom";

type SizeState = { width: number; height?: number };

/** The minimum width an element can be resized to, as a fraction of the maximum width. */
const minWidthRatio = 0.05;

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
      const minWidth = Math.min(naturalWidth, minWidthRatio * max);
      return Math.round(Math.min(max, Math.max(width, minWidth)));
    },
    [naturalWidth]
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
        const newWidth = sizeAtDragStart.width + diffX * 2;
        const constrainedWidth = constrainWidth(newWidth, maxWidth);
        const aspectRatio = naturalHeight / naturalWidth;

        setSize({
          // When dragged to or beyond the editor edge, store the natural width as a
          // sentinel for "full width" so the element stays responsive. Only do this
          // when the natural width actually exceeds the editor — otherwise constrain
          // to the editor edge rather than snapping a smaller image back down to its
          // natural size.
          width:
            newWidth >= maxWidth && naturalWidth >= maxWidth
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
        // When no width has been set yet the element is displayed at full width,
        // so begin resizing from the maximum width rather than the minimum.
        width: constrainWidth(size.width || max, max),
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
