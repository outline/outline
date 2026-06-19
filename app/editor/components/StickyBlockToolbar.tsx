import { NodeSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import * as React from "react";
import styled from "styled-components";
import { isCode } from "@shared/editor/lib/isCode";
import { findParentNode } from "@shared/editor/queries/findParentNode";
import type { MenuItem } from "@shared/editor/types";
import { depths, s } from "@shared/styles";
import { HEADER_HEIGHT } from "~/components/Header";
import { Portal } from "~/components/Portal";
import useWindowSize from "~/hooks/useWindowSize";
import { useEditor } from "./EditorContext";
import ToolbarMenu from "./ToolbarMenu";

type Props = {
  /** The menu items to render in the toolbar. */
  items: MenuItem[];
  /** Whether the text direction is right-to-left. */
  rtl: boolean;
};

type TrackRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

// Height of the toolbar, used to offset it above the block.
const menuHeight = 36;

// Gap between the toolbar and the block / document header.
const margin = 8;

/**
 * Resolves the DOM element of the block (code or notice) the current selection
 * is anchored to, which the toolbar tracks.
 */
function getBlockElement(view: EditorView): HTMLElement | null {
  const { selection } = view.state;
  const isCodeNodeSelection =
    selection instanceof NodeSelection && isCode(selection.node);
  const block = isCodeNodeSelection
    ? { pos: selection.from }
    : (findParentNode(isCode)(selection) ??
      findParentNode((node) => node.type.name === "container_notice")(
        selection
      ));
  if (!block) {
    return null;
  }
  const dom = view.nodeDOM(block.pos);
  return dom instanceof HTMLElement ? dom : null;
}

function sameRect(a: TrackRect | null, b: TrackRect | null) {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return (
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height
  );
}

/**
 * Renders a block toolbar (code, notice) as a sticky element that pins to the
 * top of the viewport while the block is scrolled through, rather than a
 * floating toolbar positioned once over the selection and left behind on
 * scroll. A track element is absolutely positioned over the block; the toolbar
 * is a `position: sticky` child constrained to that track, so the browser keeps
 * it visible without any scroll listener and releases it when the block leaves
 * the viewport.
 *
 * @param items - the menu items to render.
 * @param rtl - whether the document is right-to-left.
 * @returns the sticky block toolbar.
 */
const StickyBlockToolbar = React.forwardRef(function StickyBlockToolbar_(
  { items, rtl }: Props,
  ref: React.RefObject<HTMLDivElement>
) {
  const { view } = useEditor();
  const trackRef = ref || React.createRef<HTMLDivElement>();
  const [rect, setRect] = React.useState<TrackRect | null>(null);

  // Re-measure when the window resizes; scroll is handled by `position: sticky`.
  useWindowSize();

  const element = getBlockElement(view);

  // Measure the block relative to the portal's offset parent.
  React.useLayoutEffect(() => {
    const track = trackRef.current;
    if (!element || !track) {
      setRect((prev) => (prev === null ? prev : null));
      return;
    }

    const offsetParent = track.offsetParent;
    const parent = offsetParent
      ? offsetParent.getBoundingClientRect()
      : { top: 0, left: 0 };
    // Extend the track above the block by the toolbar height so the toolbar's
    // natural (unstuck) position floats above the block rather than over its
    // first line. The track still ends at the block's bottom so the toolbar is
    // released as the block scrolls out of view.
    const offset = menuHeight + margin;
    const bounds = element.getBoundingClientRect();
    const next: TrackRect = {
      top: Math.round(bounds.top - parent.top - offset),
      left: Math.round(bounds.left - parent.left),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height + offset),
    };

    setRect((prev) => (sameRect(prev, next) ? prev : next));
  });

  return (
    <Portal>
      <Track
        ref={trackRef}
        $rtl={rtl}
        style={
          rect
            ? {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                visibility: "visible",
              }
            : undefined
        }
      >
        <Sticky>
          <Background>
            <ToolbarMenu items={items} />
          </Background>
        </Sticky>
      </Track>
    </Portal>
  );
});

const Track = styled.div<{ $rtl: boolean }>`
  position: absolute;
  top: 0;
  left: -10000px;
  visibility: hidden;
  display: flex;
  justify-content: ${(props) => (props.$rtl ? "flex-start" : "flex-end")};
  align-items: flex-start;
  pointer-events: none;
  z-index: ${depths.editorToolbar};

  @media print {
    display: none;
  }
`;

const Sticky = styled.div`
  position: sticky;
  top: calc(var(--header-offset, ${HEADER_HEIGHT}px) + ${margin}px);
  pointer-events: auto;
  line-height: 0;
`;

const Background = styled.div`
  background-color: ${s("menuBackground")};
  box-shadow: ${s("menuShadow")};
  border-radius: 4px;
  height: 36px;
`;

export default StickyBlockToolbar;
