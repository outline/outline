import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { useDragFollower, useDragLayer } from "~/components/DragAndDrop";
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

const DragPlaceholder = () => {
  const { t } = useTranslation();
  const { ui } = useStores();
  const followPointer = useDragFollower(POINTER_OFFSET_X, -POINTER_OFFSET_Y);

  const { item } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
  }));

  if (!item) {
    return null;
  }

  return (
    <div style={layerStyles}>
      <div ref={followPointer} style={{ width: ui.sidebarWidth - 24 }}>
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
