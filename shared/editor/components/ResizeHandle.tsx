import type * as React from "react";
import styled from "styled-components";
import { s } from "../../styles";
import type { DragDirection } from "./hooks/useDragResize";

interface ResizeHandlesProps {
  /** Returns the pointer down handler for a resize direction. */
  onPointerDown: (
    direction: DragDirection
  ) => (event: React.PointerEvent<HTMLDivElement>) => void;
  /** Callback triggered when a handle is double-clicked. */
  onDoubleClick?: () => void;
  /** Whether the side handles are visible without hover. */
  isVisible: boolean;
  /** Whether the handles sit inside the edges, for wrappers that clip overflow. */
  isInset?: boolean;
}

/**
 * The full set of resize handles for a media node: visible side handles, and
 * invisible bottom and corner handles.
 *
 * @param props - the component props.
 * @returns the resize handles.
 */
export function ResizeHandles({
  onPointerDown,
  onDoubleClick,
  isVisible,
  isInset = false,
}: ResizeHandlesProps) {
  return (
    <>
      <ResizeLeft
        onPointerDown={onPointerDown("left")}
        onDoubleClick={onDoubleClick}
        $dragging={isVisible}
      />
      <ResizeRight
        onPointerDown={onPointerDown("right")}
        onDoubleClick={onDoubleClick}
        $dragging={isVisible}
      />
      <ResizeBottom
        onPointerDown={onPointerDown("bottom")}
        onDoubleClick={onDoubleClick}
        $inset={isInset}
      />
      <ResizeTopLeft
        onPointerDown={onPointerDown("topLeft")}
        onDoubleClick={onDoubleClick}
        $inset={isInset}
      />
      <ResizeTopRight
        onPointerDown={onPointerDown("topRight")}
        onDoubleClick={onDoubleClick}
        $inset={isInset}
      />
      <ResizeBottomLeft
        onPointerDown={onPointerDown("bottomLeft")}
        onDoubleClick={onDoubleClick}
        $inset={isInset}
      />
      <ResizeBottomRight
        onPointerDown={onPointerDown("bottomRight")}
        onDoubleClick={onDoubleClick}
        $inset={isInset}
      />
    </>
  );
}

export const ResizeLeft = styled.div<{ $dragging: boolean }>`
  cursor: ew-resize;
  position: absolute;
  left: -4px;
  top: 30%;
  bottom: 30%;
  width: 8px;
  user-select: none;
  opacity: ${(props) => (props.$dragging ? 1 : 0)};
  transition: opacity 150ms ease-in-out;

  &:after {
    content: "";
    position: absolute;
    left: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: 6px;
    height: 25%;
    min-height: 20px;
    border-radius: 4px;
    background: ${s("menuBackground")};
    box-shadow: 0 0 0 1px ${s("textSecondary")};
    opacity: 0.75;
  }

  @media print {
    display: none;
  }
`;

export const ResizeRight = styled(ResizeLeft)`
  left: initial;
  right: -4px;

  &:after {
    left: initial;
    right: 8px;
  }
`;

interface EdgeProps {
  $inset: boolean;
}

/** Offsets an invisible handle by half its size, or keeps it inside the edge. */
const edgeOffset = (props: EdgeProps) => (props.$inset ? "0" : "-4px");

export const ResizeBottom = styled.div<EdgeProps>`
  cursor: ns-resize;
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: ${edgeOffset};
  height: 8px;
  z-index: 9;
  user-select: none;

  @media print {
    display: none;
  }
`;

export const ResizeCorner = styled.div<EdgeProps>`
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  z-index: 10;
  user-select: none;

  @media print {
    display: none;
  }
`;

export const ResizeTopLeft = styled(ResizeCorner)`
  cursor: nwse-resize;
  top: ${edgeOffset};
  left: ${edgeOffset};
`;

export const ResizeTopRight = styled(ResizeCorner)`
  cursor: nesw-resize;
  top: ${edgeOffset};
  right: ${edgeOffset};
`;

export const ResizeBottomLeft = styled(ResizeCorner)`
  cursor: nesw-resize;
  bottom: ${edgeOffset};
  left: ${edgeOffset};
`;

export const ResizeBottomRight = styled(ResizeCorner)`
  cursor: nwse-resize;
  bottom: ${edgeOffset};
  right: ${edgeOffset};
`;
