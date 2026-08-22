import { observer } from "mobx-react";
import { createContext, useEffect, useState, type ReactNode } from "react";
import type { ConnectDragSource } from "react-dnd";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { SidebarSection, UserPreference } from "@shared/types";
import useCurrentUser from "~/hooks/useCurrentUser";
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

/**
 * Normalizes a persisted sidebar section order — unknown values and
 * duplicates are removed, and missing sections are appended in their default
 * order.
 *
 * @param saved The persisted section order, if any.
 * @returns the full list of sidebar sections in display order.
 */
export function normalizeSidebarSectionOrder(
  saved?: SidebarSection[]
): SidebarSection[] {
  const all = Object.values(SidebarSection);
  const valid = [...new Set(saved)].filter((section) => all.includes(section));
  return [...valid, ...all.filter((section) => !valid.includes(section))];
}

/**
 * Computes the sidebar section order after moving a section next to another.
 *
 * @param order The current section order.
 * @param section The section being moved.
 * @param position Whether to place the section before or after the target.
 * @param target The section to place it relative to.
 * @returns the new order, or undefined when the move would not change it.
 */
export function moveSidebarSection(
  order: SidebarSection[],
  section: SidebarSection,
  position: "before" | "after",
  target: SidebarSection
): SidebarSection[] | undefined {
  if (section === target) {
    return undefined;
  }

  const result = order.filter((s) => s !== section);
  const targetIndex = result.indexOf(target);
  result.splice(
    position === "after" ? targetIndex + 1 : targetIndex,
    0,
    section
  );

  return result.every((s, i) => s === order[i]) ? undefined : result;
}

type Props = {
  /** The section being rendered. */
  section: SidebarSection;
  children: ReactNode;
};

/**
 * Wraps a sidebar section so it can be reordered by dragging its header. The
 * resulting order is persisted to the server as a user preference. Sections
 * whose children render nothing are hidden along with their drop targets.
 */
function DraggableSection({ section, children }: Props) {
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
    moveSidebarSection(order, dragged, "before", section)
  );
  const [bottomProps, dropBottomRef] = useDropToReorderSidebarSection(
    (dragged) => moveSidebarSection(order, dragged, "after", section)
  );

  // The drop cursors and the drag styling must not appear inside the
  // browser's dragstart dispatch — Chromium aborts the drag when the element
  // under the drag origin changes before the drag session starts.
  const showCursors = useDeferredFlag(bottomProps.isDragging);
  const isDraggingDeferred = useDeferredFlag(isDragging);

  return (
    <SectionWrapper>
      {showCursors && (
        <TopDropCursor
          isActiveDrop={topProps.isOverCursor}
          innerRef={dropTopRef}
          position="top"
        />
      )}
      <Draggable $isDragging={isDraggingDeferred}>
        <SectionDragContext.Provider value={dragRef}>
          {children}
        </SectionDragContext.Provider>
      </Draggable>
      {showCursors && (
        <SectionDropCursor
          isActiveDrop={bottomProps.isOverCursor}
          innerRef={dropBottomRef}
        />
      )}
    </SectionWrapper>
  );
}

/**
 * Returns the given flag with its rising edge deferred by one task. A falling
 * edge resets immediately.
 *
 * @param value The flag to defer.
 * @returns the deferred flag.
 */
function useDeferredFlag(value: boolean): boolean {
  const [deferred, setDeferred] = useState(false);

  useEffect(() => {
    if (!value) {
      setDeferred(false);
      return undefined;
    }
    const timer = setTimeout(() => setDeferred(true), 0);
    return () => clearTimeout(timer);
  }, [value]);

  return deferred;
}

const Draggable = styled.div<{ $isDragging: boolean }>`
  display: flex;
  flex-direction: column;
  transition: opacity 250ms ease;
  opacity: ${(props) => (props.$isDragging ? 0.1 : 1)};
  pointer-events: ${(props) => (props.$isDragging ? "none" : "inherit")};
`;

// Centers the cursor line in the 12px gap between sections — the visible
// band sits 6px from the cursor's top.
const SectionDropCursor = styled(DropCursor)`
  ${(props) => (props.position === "top" ? "top: -13px;" : "bottom: -13px;")}
`;

const TopDropCursor = styled(SectionDropCursor)``;

const SectionWrapper = styled(Section)`
  /* Hide the section entirely when its content renders nothing. */
  &:has(${Draggable}:empty) {
    display: none;
  }

  /* Only the first visible section offers a drop slot above itself. */
  &:not(:has(${Draggable}:empty)) ~ & ${TopDropCursor} {
    display: none;
  }
`;

export default observer(DraggableSection);
