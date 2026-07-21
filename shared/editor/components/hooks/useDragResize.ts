import * as React from "react";
import { EditorStyleHelper } from "../../styles/EditorStyleHelper";

type DragDirection =
  | "left"
  | "right"
  | "bottom"
  | "topLeft"
  | "topRight"
  | "bottomLeft"
  | "bottomRight";

type SizeState = { width: number; height?: number };

/** The minimum width an element can be resized to, as a fraction of the maximum width. */
const minWidthRatio = 0.05;

const resizeDragCursorProperty = "--resize-drag-cursor";

/**
 * Returns the CSS cursor value for a given resize drag direction.
 *
 * @param direction the active resize drag direction.
 * @return the matching CSS cursor keyword.
 */
function getResizeDragCursor(direction: DragDirection): string {
  if (direction === "left" || direction === "right") {
    return "ew-resize";
  }
  if (direction === "bottom") {
    return "ns-resize";
  }
  if (direction === "topLeft" || direction === "bottomRight") {
    return "nwse-resize";
  }
  return "nesw-resize";
}

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
  dragging: DragDirection | undefined;
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
  /** Whether the element should scale symmetrically from the center. Defaults to true. */
  isCentered?: boolean;
};

export default function useDragResize(props: Params): ReturnValue {
  const {
    onChangeSize,
    naturalWidth,
    naturalHeight,
    gridHeightSnap,
    minHeight,
    ref,
    isCentered = true,
  } = props;

  const [size, setSize] = React.useState<SizeState>({
    width: props.width,
    height: props.height,
  });
  const [maxWidth, setMaxWidth] = React.useState(Infinity);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
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

      let diffX = 0;
      let diffY = 0;
      if (dragging === "left") {
        diffX = offset.x - event.pageX;
      } else if (dragging === "right") {
        diffX = event.pageX - offset.x;
      } else if (dragging === "bottom") {
        diffY = event.pageY - offset.y;
      } else if (dragging === "topLeft") {
        diffX = offset.x - event.pageX;
        diffY = offset.y - event.pageY;
      } else if (dragging === "topRight") {
        diffX = event.pageX - offset.x;
        diffY = offset.y - event.pageY;
      } else if (dragging === "bottomLeft") {
        diffX = offset.x - event.pageX;
        diffY = event.pageY - offset.y;
      } else if (dragging === "bottomRight") {
        diffX = event.pageX - offset.x;
        diffY = event.pageY - offset.y;
      }

      const isCorner = [
        "topLeft",
        "topRight",
        "bottomLeft",
        "bottomRight",
      ].includes(dragging || "");

      if (isCorner && naturalHeight && naturalWidth) {
        const aspectRatio = naturalHeight / naturalWidth;
        const hFactor = isCentered ? 0.5 : 1;
        const factor = isCentered ? 2 : 1;
        const dW =
          (diffX * hFactor + diffY * aspectRatio) /
          (hFactor * hFactor + aspectRatio * aspectRatio);
        diffX = dW / factor;
      }

      if (diffX && sizeAtDragStart.width) {
        const factor = isCentered ? 2 : 1;
        const newWidth = sizeAtDragStart.width + diffX * factor;
        const constrainedWidth = constrainWidth(newWidth, maxWidth);
        const aspectRatio = naturalHeight / naturalWidth;

        // When dragged to or beyond the editor edge, store the natural width as a
        // sentinel for "full width" so the element stays responsive. Only do this
        // when the natural width actually exceeds the editor — otherwise constrain
        // to the editor edge rather than snapping a smaller image back down to its
        // natural size.
        const nextWidth =
          newWidth >= maxWidth && naturalWidth >= maxWidth
            ? naturalWidth
            : constrainedWidth;
        const nextHeight = isCorner
          ? naturalWidth
            ? Math.round(constrainedWidth * aspectRatio)
            : undefined
          : sizeAtDragStart.height;

        setSize({
          width: nextWidth,
          height: nextHeight,
        });

        window.dispatchEvent(
          new CustomEvent("media-drag-resize", {
            detail: {
              width: nextWidth,
              height: nextHeight,
              isDragging: true,
            },
          })
        );
      }

      if (diffY && sizeAtDragStart.height && !isCorner) {
        const gridHeight = gridHeightSnap ?? 10;
        const newHeight = sizeAtDragStart.height + diffY;
        const heightOnGrid = Math.round(newHeight / gridHeight) * gridHeight;
        const nextHeight = Math.max(heightOnGrid, minHeight ?? 50);

        setSize((state) => {
          const nextState = {
            ...state,
            height: nextHeight,
          };
          window.dispatchEvent(
            new CustomEvent("media-drag-resize", {
              detail: {
                ...nextState,
                isDragging: true,
              },
            })
          );
          return nextState;
        });
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

      setOffset({ x: 0, y: 0 });
      setDragging(undefined);
      onChangeSize?.(sizeRef.current);

      window.dispatchEvent(
        new CustomEvent("media-drag-resize", {
          detail: {
            ...sizeRef.current,
            isDragging: false,
          },
        })
      );
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

        window.dispatchEvent(
          new CustomEvent("media-drag-resize", {
            detail: {
              ...sizeAtDragStart,
              isDragging: false,
            },
          })
        );
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
      setOffset({
        x: event.pageX,
        y: event.pageY,
      });
      setDragging(dragDirection);
    };

  React.useEffect(() => {
    if (!isResizable) {
      return;
    }

    if (dragging) {
      document.body.classList.add(EditorStyleHelper.resizeDragging);
      document.body.style.setProperty(
        resizeDragCursorProperty,
        getResizeDragCursor(dragging)
      );
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp);
    }

    return () => {
      document.body.classList.remove(EditorStyleHelper.resizeDragging);
      document.body.style.removeProperty(resizeDragCursorProperty);
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
    dragging,
    setSize,
    width: size.width,
    height: size.height,
  };
}
