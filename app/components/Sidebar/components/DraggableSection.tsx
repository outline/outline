import { observer } from "mobx-react";
import { createContext, type ReactNode } from "react";
import type { ConnectDragSource } from "react-dnd";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { SidebarSection, UserPreference } from "@shared/types";
import useCurrentUser from "~/hooks/useCurrentUser";
import {
  moveSidebarSection,
  normalizeSidebarSectionOrder,
} from "~/utils/sidebarSections";
import {
  useDragSidebarSection,
  useDropToReorderSidebarSection,
} from "../hooks/useDragAndDrop";
import DropCursor from "./DropCursor";
import Section from "./Section";

/**
 * Carries the drag connector for a sidebar section so the section header can
 * register itself as the drag handle.
 */
export const SectionDragContext = createContext<ConnectDragSource | null>(null);

type Props = {
  /** The section being rendered. */
  section: SidebarSection;
  /** Whether this is the first visible section in the sidebar. */
  isFirst: boolean;
  /** Whether the section has visible content — hidden sections render without drag or drop targets. */
  enabled: boolean;
  children: ReactNode;
};

/**
 * Wraps a sidebar section so it can be reordered by dragging its header. The
 * resulting order is persisted to the server as a user preference.
 */
function DraggableSection({ section, isFirst, enabled, children }: Props) {
  const { t } = useTranslation();
  const user = useCurrentUser();

  const titles: Record<SidebarSection, string> = {
    [SidebarSection.Starred]: t("Starred"),
    [SidebarSection.SharedWithMe]: t("Shared with me"),
    [SidebarSection.Collections]: t("Collections"),
  };

  const order = normalizeSidebarSectionOrder(
    user.getPreference(UserPreference.SidebarSectionOrder, [])
  );

  const [{ isDragging }, dragRef] = useDragSidebarSection(
    section,
    titles[section]
  );
  const [topProps, dropTopRef] = useDropToReorderSidebarSection((dragged) =>
    moveSidebarSection(order, dragged, null)
  );
  const [bottomProps, dropBottomRef] = useDropToReorderSidebarSection(
    (dragged) => moveSidebarSection(order, dragged, section)
  );

  if (!enabled) {
    return <Section>{children}</Section>;
  }

  return (
    <Section>
      {isFirst && topProps.isDragging && (
        <DropCursor
          isActiveDrop={topProps.isOverCursor}
          innerRef={dropTopRef}
          position="top"
        />
      )}
      <Draggable $isDragging={isDragging}>
        <SectionDragContext.Provider value={dragRef}>
          {children}
        </SectionDragContext.Provider>
      </Draggable>
      {bottomProps.isDragging && (
        <DropCursor
          isActiveDrop={bottomProps.isOverCursor}
          innerRef={dropBottomRef}
        />
      )}
    </Section>
  );
}

const Draggable = styled.div<{ $isDragging: boolean }>`
  display: flex;
  flex-direction: column;
  transition: opacity 250ms ease;
  opacity: ${(props) => (props.$isDragging ? 0.1 : 1)};
  pointer-events: ${(props) => (props.$isDragging ? "none" : "inherit")};
`;

export default observer(DraggableSection);
