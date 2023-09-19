import * as React from "react";

type DragDirection = "left" | "right";

type SizeState = { width: number; height?: number };

type ReturnValue = {
  handlePointerDown: (
    dragging: DragDirection
  ) => (event: React.PointerEvent<HTMLDivElement>) => void;
  setSize: React.Dispatch<React.SetStateAction<SizeState>>;
  dragging: boolean;
  width: number;
  height?: number;
};

type Props = {
  onChangeSize?: undefined | ((size: SizeState) => void);
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
  minWidth: number;
  maxWidth: number;
  gridWidth: number;
};

export default function useDragResize(props: Props): ReturnValue {
  const [size, setSize] = React.useState<SizeState>({
    width: props.width,
    height: props.height,
  });
  const [offset, setOffset] = React.useState(0);
  const [sizeAtDragStart, setSizeAtDragStart] = React.useState(size);
  const [dragging, setDragging] = React.useState<DragDirection>();
  const isResizable = !!props.onChangeSize;

  const constrainWidth = (width: number) =>
    Math.round(Math.min(props.maxWidth, Math.max(width, props.minWidth)));

  const handlePointerMove = (event: PointerEvent) => {
    event.preventDefault();

    let diff;
    if (dragging === "left") {
      diff = offset - event.pageX;
    } else {
      diff = event.pageX - offset;
    }

    const newWidth = sizeAtDragStart.width + diff * 2;
    const widthOnGrid =
      Math.round(newWidth / props.gridWidth) * props.gridWidth;
    const constrainedWidth = constrainWidth(widthOnGrid);
    const aspectRatio = props.naturalHeight / props.naturalWidth;

    setSize({
      width: constrainedWidth,
      height: props.naturalWidth
        ? Math.round(constrainedWidth * aspectRatio)
        : undefined,
    });
  };

  const handlePointerUp = (event: PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();

    setOffset(0);
    setDragging(undefined);
    props.onChangeSize?.(size);

    document.removeEventListener("mousemove", handlePointerMove);
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
    (dragging: "left" | "right") =>
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setSizeAtDragStart({
        width: constrainWidth(size.width),
        height: size.height,
      });
      setOffset(event.pageX);
      setDragging(dragging);
    };

  React.useEffect(() => {
    if (!isResizable) {
      return;
    }

    if (dragging) {
      document.body.style.cursor = "ew-resize";
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
