import * as React from "react";
import { contentWidth } from "../../lib/contentWidth";
import { EditorStyleHelper } from "../../styles/EditorStyleHelper";

/** A side or corner of an element that can be dragged to resize it. */
export type DragDirection =
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
  /** The committed width of the element, this is the source of truth. */
  width: number;
  /** The committed height of the element, this is the source of truth. */
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
  ref: React.RefObject<HTMLDivElement | null>;
  /** Whether the element should scale symmetrically from the center. Defaults to true. */
  isCentered?: boolean;
  /** Whether resizing keeps the aspect ratio. Defaults to true. */
  isLocked?: boolean;
  /** The height to width ratio kept while locked. Defaults to the natural ratio, then the ratio at drag start. */
  aspectRatio?: number;
};

const cornerDirections: DragDirection[] = [
  "topLeft",
  "topRight",
  "bottomLeft",
  "bottomRight",
];

export default function useDragResize(props: Params): ReturnValue {
  const {
    onChangeSize,
    naturalWidth,
    naturalHeight,
    gridHeightSnap,
    minHeight,
    ref,
    isCentered = true,
    isLocked = true,
  } = props;
  const aspectRatio =
    props.aspectRatio ??
    (naturalWidth && naturalHeight ? naturalHeight / naturalWidth : undefined);

  // The committed size passed in through props is the source of truth. `draft`
  // holds the size being previewed while resizing and is released once the
  // committed size arrives back through props, so the element never flashes at
  // its previous size between the drag ending and the change round-tripping.
  const [draft, setDraft] = React.useState<SizeState | null>(null);
  const [committed, setCommitted] = React.useState<SizeState>({
    width: props.width,
    height: props.height,
  });
  const [maxWidth, setMaxWidth] = React.useState(Infinity);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [sizeAtDragStart, setSizeAtDragStart] = React.useState<SizeState>({
    width: props.width,
    height: props.height,
  });
  const [ratioAtDragStart, setRatioAtDragStart] = React.useState<number>();
  const [dragging, setDragging] = React.useState<DragDirection>();
  const isResizable = !!onChangeSize;

  // Release the draft whenever the committed size changes, whether that's this
  // element's own resize landing or an external change such as undo, a reset,
  // or a collaborator resizing the same node. Skipped while dragging so a
  // remote change cannot yank the element out from under the pointer.
  if (
    !dragging &&
    (!Object.is(committed.width, props.width) ||
      !Object.is(committed.height, props.height))
  ) {
    setCommitted({ width: props.width, height: props.height });
    setDraft(null);
  }

  const size = draft ?? { width: props.width, height: props.height };

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
      if (!dragging) {
        return;
      }

      const isCorner = cornerDirections.includes(dragging);
      const isLeft =
        dragging === "left" ||
        dragging === "topLeft" ||
        dragging === "bottomLeft";
      const isTop = dragging === "topLeft" || dragging === "topRight";
      const movesX = dragging !== "bottom";
      const movesY = dragging === "bottom" || isCorner;
      const diffX = movesX
        ? isLeft
          ? offset.x - event.pageX
          : event.pageX - offset.x
        : 0;
      const diffY = movesY
        ? isTop
          ? offset.y - event.pageY
          : event.pageY - offset.y
        : 0;
      const factor = isCentered ? 2 : 1;
      const startWidth = sizeAtDragStart.width;

      // When dragged to or beyond the editor edge, store the natural width as a
      // sentinel for "full width" so the element stays responsive. Only do this
      // when the natural width actually exceeds the editor — otherwise constrain
      // to the editor edge rather than snapping a smaller image back down to its
      // natural size.
      const toWidth = (newWidth: number) => {
        const constrained = constrainWidth(newWidth, maxWidth);
        return {
          stored:
            newWidth >= maxWidth && naturalWidth >= maxWidth
              ? naturalWidth
              : constrained,
        };
      };

      let nextState: SizeState;

      if (isLocked && ratioAtDragStart) {
        const ratio = ratioAtDragStart;
        let newWidth = startWidth + diffX * factor;

        if (dragging === "bottom") {
          newWidth = startWidth + diffY / ratio;
        } else if (isCorner) {
          // Project the pointer movement onto the diagonal of the aspect ratio.
          const hFactor = 1 / factor;
          newWidth =
            startWidth +
            (diffX * hFactor + diffY * ratio) /
              (hFactor * hFactor + ratio * ratio);
        }

        const { stored } = toWidth(newWidth);
        nextState = {
          width: stored,
          height: Math.round(stored * ratio),
        };
      } else {
        let nextHeight = sizeAtDragStart.height;
        if (movesY && sizeAtDragStart.height) {
          const gridHeight = gridHeightSnap ?? 10;
          const newHeight = sizeAtDragStart.height + diffY;
          const heightOnGrid = Math.round(newHeight / gridHeight) * gridHeight;
          nextHeight = Math.max(heightOnGrid, minHeight ?? 50);
        }

        nextState = {
          // Vertical-only drags never adjust the width, so it is carried over
          // from the current size rather than recomputed.
          width: movesX
            ? toWidth(startWidth + diffX * factor).stored
            : sizeRef.current.width,
          height: nextHeight,
        };
      }

      setDraft(nextState);

      window.dispatchEvent(
        new CustomEvent("media-drag-resize", {
          detail: {
            ...nextState,
            isDragging: true,
          },
        })
      );
    },
    [
      dragging,
      offset,
      sizeAtDragStart,
      ratioAtDragStart,
      maxWidth,
      gridHeightSnap,
      naturalWidth,
      isLocked,
      minHeight,
      constrainWidth,
      isCentered,
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

        setDraft(sizeAtDragStart);
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
    setDraft(newSize);
    onChangeSize?.(newSize);
  };

  const handlePointerDown =
    (dragDirection: DragDirection) =>
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      // Calculate constraints once at the start of dragging as it's relatively expensive operation
      const max = ref.current ? contentWidth(ref.current) : Infinity;
      setMaxWidth(max);

      // When no width has been set yet the element is displayed at full width,
      // so begin resizing from the maximum width rather than the minimum.
      const startWidth = constrainWidth(size.width || max, max);
      setSizeAtDragStart({ width: startWidth, height: size.height });
      setRatioAtDragStart(
        aspectRatio ??
          (size.height && startWidth ? size.height / startWidth : undefined)
      );
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
    width: size.width,
    height: size.height,
  };
}
