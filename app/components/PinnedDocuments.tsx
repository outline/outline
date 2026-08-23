import type { DragEndEvent } from "@dnd-kit/core";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import fractionalIndex from "fractional-index";
import { AnimatePresence } from "framer-motion";
import { observer } from "mobx-react";
import { CollapseIcon } from "outline-icons";
import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s, hover, hideScrollbars } from "@shared/styles";
import type Pin from "~/models/Pin";
import DocumentCard from "~/components/DocumentCard";
import { DocumentChip } from "~/components/DocumentChip";
import Fade from "~/components/Fade";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import useMobile from "~/hooks/useMobile";
import usePersistedState from "~/hooks/usePersistedState";
import useStores from "~/hooks/useStores";
import { ResizingHeightContainer } from "./ResizingHeightContainer";

type Props = {
  /** Pins to display */
  pins: Pin[];
  /** Maximum number of pins to display */
  limit?: number;
  /** Number of placeholder pins to display */
  placeholderCount?: number;
  /**
   * When provided the section can be collapsed by the user, the preference is
   * persisted locally under this key.
   */
  collapseKey?: string;
};

function PinnedDocuments({
  limit,
  pins,
  placeholderCount,
  collapseKey,
  ...rest
}: Props) {
  const { t } = useTranslation();
  const { documents } = useStores();
  const isMobile = useMobile();
  const [items, setItems] = useState(pins.map((pin) => pin.documentId));
  const showPlaceholderRef = useRef(true);
  // Only ever read or written when the section is collapsible
  const [collapsed, setCollapsed] = usePersistedState<boolean>(
    collapseKey ? `pins-collapsed-${collapseKey}` : "pins-collapsed",
    false
  );
  const isCollapsible =
    !isMobile && !!collapseKey && (!!items.length || !!placeholderCount);
  const isCollapsed = isCollapsible && collapsed;
  const showPlaceholder =
    placeholderCount && !items.length && showPlaceholderRef.current;

  const handleToggleCollapsed = useCallback(() => {
    setCollapsed((state) => !state);
  }, [setCollapsed]);

  useEffect(() => {
    setItems(pins.map((pin) => pin.documentId));
  }, [pins]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        setItems((existing) => {
          const activePos = existing.indexOf(active.id as string);
          const overPos = existing.indexOf(over.id as string);

          const overIndex = pins[overPos]?.index || null;
          const nextIndex = pins[overPos + 1]?.index || null;
          const prevIndex = pins[overPos - 1]?.index || null;
          const pin = pins[activePos];

          // Update the order on the backend, revert if the call fails
          pin
            .save({
              index:
                overPos === 0
                  ? fractionalIndex(null, overIndex)
                  : activePos > overPos
                    ? fractionalIndex(prevIndex, overIndex)
                    : fractionalIndex(overIndex, nextIndex),
            })
            .catch(() => setItems(existing));

          // Update the order in state immediately
          return arrayMove(existing, activePos, overPos);
        });
      }
    },
    [pins]
  );

  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToParentElement]}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <Wrapper $collapsible={isCollapsible} $collapsed={isCollapsed}>
        {isCollapsible && (
          <Tooltip content={isCollapsed ? t("Expand") : t("Collapse")}>
            <ToggleButton
              $visible={isCollapsed}
              onClick={handleToggleCollapsed}
              aria-expanded={!isCollapsed}
              aria-label={isCollapsed ? t("Expand") : t("Collapse")}
            >
              <ToggleIcon />
            </ToggleButton>
          </Tooltip>
        )}
        {isCollapsed && (
          <Chips>
            {items.map((documentId) => {
              const document = documents.get(documentId);
              const pin = pins.find((p) => p.documentId === documentId);

              return document ? (
                <DocumentChip key={documentId} document={document} pin={pin} />
              ) : null;
            })}
          </Chips>
        )}
        <ResizingHeightContainer
          config={{
            transition: {
              duration: 0.2,
              ease: "easeInOut",
            },
          }}
        >
          {isCollapsed ? null : (
            <SortableContext items={items} strategy={rectSortingStrategy}>
              <List $flush={isCollapsible}>
                {showPlaceholder ? (
                  Array(placeholderCount)
                    .fill(undefined)
                    .map((_, index) => (
                      <div key={index} style={{ width: 170, height: 180 }} />
                    ))
                ) : (
                  <AnimatePresence initial={false}>
                    {items.map((documentId) => {
                      const document = documents.get(documentId);
                      const pin = pins.find((p) => p.documentId === documentId);

                      // Once any document is loaded, never render the placeholder again
                      showPlaceholderRef.current = false;

                      return document ? (
                        <DocumentCard
                          key={documentId}
                          document={document}
                          isDraggable={items.length > 1}
                          pin={pin}
                          {...rest}
                        />
                      ) : null;
                    })}
                  </AnimatePresence>
                )}
              </List>
            </SortableContext>
          )}
        </ResizingHeightContainer>
      </Wrapper>
    </DndContext>
  );
}

const ToggleIcon = styled(CollapseIcon)`
  background: ${s("background")};
`;

const ToggleButton = styled(NudeButton)<{ $visible: boolean }>`
  position: absolute;
  top: 0;
  right: 0;
  z-index: 1;
  color: ${s("textTertiary")};
  opacity: ${(props) => (props.$visible ? 1 : 0)};
  transition: opacity 100ms ease-in-out;

  &:${hover},
  &:active,
  &:focus-visible {
    color: ${s("text")};
    opacity: 1;
  }
`;

const Wrapper = styled.div<{ $collapsible: boolean; $collapsed: boolean }>`
  position: relative;

  // replaces the top margin of the list so the toggle takes no additional space
  padding-top: ${(props) =>
    props.$collapsible && !props.$collapsed ? 16 : 0}px;

  ${`&:${hover}`} ${ToggleButton} {
    opacity: 1;
  }
`;

const Chips = styled(Fade)`
  ${hideScrollbars()}
  display: flex;
  gap: 8px;
  height: 24px;
  overflow-x: auto;
  margin-bottom: 16px;

  // leave room for the collapse toggle, chips scrolling beneath it fade out
  padding-right: 28px;
  mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent);
`;

const List = styled.div<{ $flush?: boolean }>`
  display: grid;
  column-gap: 8px;
  row-gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding: 0;
  list-style: none;
  margin: ${(props) => (props.$flush ? "0" : "16px")} 0 32px;

  &:empty {
    display: none;
  }

  ${breakpoint("mobileLarge")`
    grid-template-columns: repeat(3, minmax(0, 1fr));
  `};

  ${breakpoint("tablet")`
    grid-template-columns: repeat(4, minmax(0, 1fr));
  `};
`;

export default observer(PinnedDocuments);
