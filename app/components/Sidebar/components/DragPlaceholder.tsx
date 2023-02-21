import * as React from "react";
import { useDragLayer, XYCoord } from "react-dnd";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import useStores from "~/hooks/useStores";
import SidebarLink from "./SidebarLink";

const layerStyles: React.CSSProperties = {
  position: "fixed",
  pointerEvents: "none",
  zIndex: 100,
  left: 0,
  top: 0,
  width: "100%",
  height: "100%",
};

function getItemStyles(
  initialOffset: XYCoord | null,
  currentOffset: XYCoord | null,
  sidebarWidth: number
) {
  if (!initialOffset || !currentOffset) {
    return {
      display: "none",
    };
  }
  const { y } = currentOffset;
  const x = Math.max(
    initialOffset.x,
    Math.min(initialOffset.x + sidebarWidth / 4, currentOffset.x)
  );

  const transform = `translate(${x}px, ${y}px)`;
  return {
    width: sidebarWidth - 24,
    transform,
    WebkitTransform: transform,
  };
}

const DragPlaceholder = () => {
  const { t } = useTranslation();
  const { ui } = useStores();

  const { isDragging, item, initialOffset, currentOffset } = useDragLayer(
    (monitor) => ({
      item: monitor.getItem(),
      itemType: monitor.getItemType(),
      initialOffset: monitor.getInitialSourceClientOffset(),
      currentOffset: monitor.getSourceClientOffset(),
      isDragging: monitor.isDragging(),
    })
  );

  if (!isDragging || !currentOffset) {
    return null;
  }

  return (
    <div style={layerStyles}>
      <div style={getItemStyles(initialOffset, currentOffset, ui.sidebarWidth)}>
        <GhostLink
          icon={item.icon}
          label={item.title || t("Untitled")}
          isDraft={item.isDraft}
          depth={item.depth}
          active
        />
      </div>
    </div>
  );
};

const GhostLink = styled(SidebarLink)`
  transition: box-shadow 250ms ease-in-out;
  box-shadow: rgb(0 0 0 / 30%) 0px 4px 15px;
  opacity: 0.95;
`;

export default DragPlaceholder;
