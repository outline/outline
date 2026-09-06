import * as React from "react";
import type { XYCoord } from "react-dnd";
import { useDragLayer } from "react-dnd";
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

// Keep the ghost beside the pointer so it never covers the drop cursor.
const POINTER_OFFSET_X = 12;
const POINTER_OFFSET_Y = 14;

function getItemStyles(pointerOffset: XYCoord | null, sidebarWidth: number) {
  if (!pointerOffset) {
    return {
      display: "none",
    };
  }
  const x = pointerOffset.x + POINTER_OFFSET_X;
  const y = pointerOffset.y - POINTER_OFFSET_Y;

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

  const { isDragging, item, pointerOffset } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    itemType: monitor.getItemType(),
    pointerOffset: monitor.getClientOffset(),
    isDragging: monitor.isDragging(),
  }));

  if (!isDragging || !pointerOffset) {
    return null;
  }

  return (
    <div style={layerStyles}>
      <div style={getItemStyles(pointerOffset, ui.sidebarWidth)}>
        <GhostLink
          icon={item.icon}
          label={item.title || t("Untitled")}
          isDraft={item.isDraft}
          depth={0}
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
