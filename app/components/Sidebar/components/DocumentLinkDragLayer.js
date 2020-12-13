// @flow
import * as React from "react";
import { useDragLayer } from "react-dnd";
import SidebarLink from "./SidebarLink";
import { type NavigationNode } from "types";

type DragItem = NavigationNode & {|
  active: boolean,
  depth: number,
|};

const layerStyles = {
  position: "fixed",
  pointerEvents: "none",
  zIndex: 100,
  left: 0,
  top: 0,
  width: "100%",
  height: "100%",
};
function getItemStyles(initialOffset, currentOffset) {
  if (!initialOffset || !currentOffset) {
    return {
      display: "none",
    };
  }
  let { x, y } = currentOffset;
  const transform = `translate(${x}px, ${y}px)`;

  return {
    transform,
    WebkitTransform: transform,
  };
}

export default function DocumentLinkDragLayer() {
  const {
    isDragging,
    initialOffset,
    currentOffset,
    item,
  }: {
    initialOffset: Object,
    currentOffset: Object,
    isDragging: boolean,
    item: DragItem,
  } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    isDragging: monitor.isDragging(),
    initialOffset: monitor.getInitialSourceClientOffset(),
    currentOffset: monitor.getSourceClientOffset(),
  }));

  console.log("custom is dragging", { isDragging });

  if (!isDragging) {
    return null;
  }

  return (
    <div style={layerStyles}>
      <div style={getItemStyles(initialOffset, currentOffset)}>
        <SidebarLink
          label={item.title}
          depth={item.depth}
          active={item.active}
        />
      </div>
    </div>
  );
}
