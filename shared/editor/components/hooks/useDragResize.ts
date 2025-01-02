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

  const constrainWidth = (width: number, max: number) => {
    const minWidth = Math.min(props.naturalWidth, (props.gridSnap / 100) * max);
    return Math.round(Math.min(max, Math.max(width, minWidth)));
  };

  const handlePointerMove = (event: PointerEvent) => {
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
      const gridWidth = (props.gridSnap / 100) * maxWidth;
      const newWidth = sizeAtDragStart.width + diffX * 2;
      const widthOnGrid = Math.round(newWidth / gridWidth) * gridWidth;
      const constrainedWidth = constrainWidth(widthOnGrid, maxWidth);
      const aspectRatio = props.naturalHeight / props.naturalWidth;

      setSize({
        width:
          // If the natural width is the same as the constrained width, use the natural width -
          // special case for images resized to the full width of the editor.
          constrainedWidth === Math.min(newWidth, maxWidth)
            ? props.naturalWidth
            : constrainedWidth,
        height: props.naturalWidth
          ? Math.round(constrainedWidth * aspectRatio)
          : undefined,
      });
    }

    if (diffY && sizeAtDragStart.height) {
      const gridHeight = (props.gridSnap / 100) * maxWidth;
      const newHeight = sizeAtDragStart.height + diffY;
      const heightOnGrid = Math.round(newHeight / gridHeight) * gridHeight;

      setSize((state) => ({
        ...state,
        height: heightOnGrid,
      }));
    }
  };

  const handlePointerUp = (event: PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();

    setOffset(0);
    setDragging(undefined);
    props.onChangeSize?.(size);

    document.removeEventListener("pointerup", handlePointerUp);
    document.removeEventListener("pointermove", handlePointerMove);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();

      setSize(sizeAtDragStart);
      setDragging(undefined);
    }
  };

  const handlePointerDown =
    (dragDirection: "left" | "right") =>
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      // Calculate constraints once at the start of dragging as it's relatively expensive operation
      const max = props.ref.current
        ? parseInt(
            getComputedStyle(props.ref.current).getPropertyValue(
              "--document-width"
            )
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
  }, [dragging, handlePointerMove, handlePointerUp, isResizable]);

  return {
    handlePointerDown,
    dragging: !!dragging,
    setSize,
    width: size.width,
    height: size.height,
  };
}
