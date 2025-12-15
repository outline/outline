import { NodeSelection } from "prosemirror-state";
import { selectedRect } from "prosemirror-tables";
import * as React from "react";
import { Portal as ReactPortal } from "react-portal";
import styled, { css } from "styled-components";
import { isCode } from "@shared/editor/lib/isCode";
import { findParentNode } from "@shared/editor/queries/findParentNode";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";
import { depths, s } from "@shared/styles";
import { getSafeAreaInsets } from "@shared/utils/browser";
import { HEADER_HEIGHT } from "~/components/Header";
import { Portal } from "~/components/Portal";
import useEventListener from "~/hooks/useEventListener";
import useMobile from "~/hooks/useMobile";
import useWindowSize from "~/hooks/useWindowSize";
import Logger from "~/utils/Logger";
import { useEditor } from "./EditorContext";
import { ColumnSelection } from "@shared/editor/selection/ColumnSelection";
import { RowSelection } from "@shared/editor/selection/RowSelection";
import { isTableSelected } from "@shared/editor/queries/table";

type Props = {
  align?: "start" | "end" | "center";
  active?: boolean;
  children: React.ReactNode;
  width?: number;
  forwardedRef?: React.RefObject<HTMLDivElement> | null;
};

const defaultPosition = {
  left: -10000,
  top: 0,
  offset: 0,
  maxWidth: 1000,
  blockSelection: false,
  visible: false,
};

function usePosition({
  menuRef,
  active,
  align = "center",
}: {
  menuRef: React.RefObject<HTMLDivElement>;
  active?: boolean;
  align?: Props["align"];
}) {
  const { view } = useEditor();
  const { selection } = view.state;
  const [menuWidth, setMenuWidth] = React.useState(0);
  const menuHeight = 36;

  // Measure the menu width after DOM updates to ensure accurate positioning
  React.useLayoutEffect(() => {
    if (menuRef.current) {
      const width = menuRef.current.offsetWidth;
      if (width !== menuWidth) {
        setMenuWidth(width);
      }
    }
  });

  // based on the start and end of the selection calculate the position at
  // the center top
  let fromPos;
  let toPos;
  try {
    fromPos = view.coordsAtPos(selection.from);
    toPos = view.coordsAtPos(selection.to, -1);
  } catch (err) {
    Logger.warn("Unable to calculate selection position", err);
    return defaultPosition;
  }

  // ensure that start < end for the menu to be positioned correctly
  const selectionBounds = {
    top: Math.min(fromPos.top, toPos.top),
    bottom: Math.max(fromPos.bottom, toPos.bottom),
    left: Math.min(fromPos.left, toPos.left),
    right: Math.max(fromPos.right, toPos.right),
  };

  const offsetParent = menuRef.current?.offsetParent
    ? menuRef.current.offsetParent.getBoundingClientRect()
    : ({
        width: window.innerWidth,
        height: window.innerHeight,
        top: 0,
        left: 0,
      } as DOMRect);

  // position at the top right of code blocks
  const codeBlock = findParentNode(isCode)(view.state.selection);
  const noticeBlock = findParentNode(
    (node) => node.type.name === "container_notice"
  )(view.state.selection);

  if ((codeBlock || noticeBlock) && view.state.selection.empty) {
    const position = codeBlock
      ? codeBlock.pos
      : noticeBlock
        ? noticeBlock.pos
        : null;

    if (position !== null) {
      const element = view.nodeDOM(position);
      const bounds = (element as HTMLElement).getBoundingClientRect();
      selectionBounds.top = bounds.top + menuHeight;
      selectionBounds.left = bounds.right;
      selectionBounds.right = bounds.right;
    }
  }

  if (!active || !menuRef.current || !menuHeight) {
    return defaultPosition;
  }

  // tables are an oddity, and need their own positioning logic
  const isColSelection =
    selection instanceof ColumnSelection && selection.isColSelection();
  const isRowSelection =
    selection instanceof RowSelection && selection.isRowSelection();

  if (isTableSelected(view.state)) {
    const rect = selectedRect(view.state);
    const table = view.domAtPos(rect.tableStart);
    const bounds = (table.node as HTMLElement).getBoundingClientRect();
    selectionBounds.top = bounds.top - 16;
    selectionBounds.left = bounds.left - 10;
    selectionBounds.right = bounds.left - 10;
  } else if (isColSelection) {
    const rect = selectedRect(view.state);
    const table = view.domAtPos(rect.tableStart);
    const element = (table.node as HTMLElement).querySelector(
      `tr > *:nth-child(${rect.left + 1})`
    );
    if (element instanceof HTMLElement) {
      const bounds = element.getBoundingClientRect();
      selectionBounds.top = bounds.top - 16;
      selectionBounds.left = bounds.left;
      selectionBounds.right = bounds.right;
    }
  } else if (isRowSelection) {
    const rect = selectedRect(view.state);
    const table = view.domAtPos(rect.tableStart);
    const element = (table.node as HTMLElement).querySelector(
      `tr:nth-child(${rect.top + 1}) > *`
    );
    if (element instanceof HTMLElement) {
      const bounds = element.getBoundingClientRect();
      selectionBounds.top = bounds.top;
      selectionBounds.left = bounds.left - 10;
      selectionBounds.right = bounds.left - 10;
    }
  }

  const isImageSelection =
    selection instanceof NodeSelection && selection.node?.type.name === "image";

  // Images need their own positioning to get the toolbar in the center
  if (isImageSelection) {
    const element = view.nodeDOM(selection.from);

    // Images are wrapped which impacts positioning - need to get the element
    // specifically tagged as the handle
    const imageElement = element
      ? (element as HTMLElement).getElementsByClassName(
          EditorStyleHelper.imageHandle
        )[0]
      : undefined;
    if (imageElement) {
      const { left, top, width } = imageElement.getBoundingClientRect();

      return {
        left: Math.round(left + width / 2 - menuWidth / 2 - offsetParent.left),
        top: Math.round(top - menuHeight - offsetParent.top),
        offset: 0,
        visible: true,
        blockSelection: false,
        maxWidth: "100%",
      };
    }
  }

  // calculate the horizontal center of the selection
  const halfSelection =
    Math.abs(selectionBounds.right - selectionBounds.left) / 2;
  const centerOfSelection = selectionBounds.left + halfSelection;

  // position the menu so that it is centered over the selection except in
  // the cases where it would extend off the edge of the screen. In these
  // instances leave a margin
  const margin = 12;
  const left = Math.min(
    Math.min(
      offsetParent.x + offsetParent.width - menuWidth - margin,
      window.innerWidth - margin
    ),
    Math.max(
      Math.max(offsetParent.x, margin),
      align === "center"
        ? centerOfSelection - menuWidth / 2
        : align === "start"
          ? selectionBounds.left
          : selectionBounds.right
    )
  );
  const top = Math.max(
    HEADER_HEIGHT,
    Math.min(
      window.innerHeight - menuHeight - margin,
      Math.max(margin, selectionBounds.top - menuHeight)
    )
  );

  // if the menu has been offset to not extend offscreen then we should adjust
  // the position of the triangle underneath to correctly point to the center
  // of the selection still
  const offset = left - (centerOfSelection - menuWidth / 2);
  return {
    left: Math.max(margin, Math.round(left - offsetParent.left)),
    top: Math.round(top - offsetParent.top),
    offset: Math.round(offset),
    maxWidth: Math.min(window.innerWidth, offsetParent.width) - margin * 2,
    blockSelection: !!(
      codeBlock ||
      isColSelection ||
      isRowSelection ||
      noticeBlock
    ),
    visible: true,
  };
}

const FloatingToolbar = React.forwardRef(function FloatingToolbar_(
  props: Props,
  ref: React.RefObject<HTMLDivElement>
) {
  const menuRef = ref || React.createRef<HTMLDivElement>();
  const [isSelectingText, setSelectingText] = React.useState(false);

  let position = usePosition({
    menuRef,
    active: props.active,
    align: props.align,
  });

  if (isSelectingText) {
    position = defaultPosition;
  }

  useEventListener("mouseup", () => {
    setSelectingText(false);
  });

  useEventListener("mousedown", () => {
    if (!props.active) {
      setSelectingText(true);
    }
  });

  const isMobile = useMobile();
  const { height } = useWindowSize();

  if (isMobile) {
    if (props.active && position.visible) {
      const rect = document.body.getBoundingClientRect();
      const safeAreaInsets = getSafeAreaInsets();

      return (
        <ReactPortal>
          <MobileWrapper
            ref={menuRef}
            style={{
              bottom: `calc(100% - ${
                height - rect.y - safeAreaInsets.bottom
              }px)`,
            }}
          >
            {props.children && (
              <MobileBackground>{props.children}</MobileBackground>
            )}
          </MobileWrapper>
        </ReactPortal>
      );
    }

    return null;
  }

  return (
    <Portal>
      <Wrapper
        active={props.active && position.visible}
        arrow={!!props.children && !position.blockSelection}
        ref={menuRef}
        $offset={position.offset}
        style={{
          minWidth: props.width,
          maxWidth: `${position.maxWidth}px`,
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        {props.children && (
          <Background align={props.align}>{props.children}</Background>
        )}
      </Wrapper>
    </Portal>
  );
});

type WrapperProps = {
  active?: boolean;
  arrow?: boolean;
  $offset: number;
};

const arrow = (props: WrapperProps) =>
  props.arrow
    ? css`
        &::after {
          content: "";
          display: block;
          width: 24px;
          height: 24px;
          transform: translateX(-50%) rotate(45deg);
          background: ${s("menuBackground")};
          border-radius: 3px;
          z-index: 0;
          position: absolute;
          bottom: -2px;
          left: calc(50% - ${props.$offset || 0}px);
          pointer-events: none;

          // clip to show only the bottom right corner
          clip-path: polygon(100% 50%, 100% 100%, 50% 100%);
        }
      `
    : "";

const MobileWrapper = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  width: 100vw;
  box-sizing: border-box;
  z-index: ${depths.editorToolbar};

  @media print {
    display: none;
  }
`;

const MobileBackground = styled.div`
  padding: 10px 6px;
  height: 60px;
  background-color: ${s("menuBackground")};
  border-top: 1px solid ${s("divider")};

  &:after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    height: 100px;
    background-color: ${s("menuBackground")};
  }
`;

const Background = styled.div<{ align: Props["align"] }>`
  position: relative;
  background-color: ${s("menuBackground")};
  box-shadow: ${s("menuShadow")};
  border-radius: 4px;
  height: 36px;

  ${(props) =>
    props.align === "start" &&
    `
    position: absolute;
    left: 0;
    bottom: 0;
  `}

  ${(props) =>
    props.align === "end" &&
    `
    position: absolute;
    right: 0;
    bottom: 0;
  `}
`;

const Wrapper = styled.div<WrapperProps>`
  will-change: opacity, transform;
  position: absolute;
  z-index: ${depths.editorToolbar};
  opacity: 0;
  transform: scale(0.95);
  transition:
    opacity 150ms cubic-bezier(0.175, 0.885, 0.32, 1.275),
    transform 150ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
  transition-delay: 150ms;
  line-height: 0;
  box-sizing: border-box;
  pointer-events: none;
  white-space: nowrap;

  ${arrow}

  * {
    box-sizing: border-box;
  }

  ${({ active }) =>
    active &&
    `
    transform: translateY(-6px) scale(1);
    opacity: 1;
  `};

  @media print {
    display: none;
  }
`;

export default FloatingToolbar;
