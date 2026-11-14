import { observer } from "mobx-react";
import { MoreIcon } from "outline-icons";
import { NodeSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import EventBoundary from "@shared/components/EventBoundary";
import { canDisplayAsCard } from "@shared/editor/lib/mention";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";
import { depths, s } from "@shared/styles";
import { MentionDisplay } from "@shared/types";
import { isTouchDevice } from "@shared/utils/browser";
import { toMenuItems } from "~/components/Menu/transformer";
import NudeButton from "~/components/NudeButton";
import { Portal } from "~/components/Portal";
import { Menu, MenuContent, MenuTrigger } from "~/components/primitives/Menu";
import { MenuProvider } from "~/components/primitives/Menu/MenuContext";
import { useComputed } from "~/hooks/useComputed";
import useEventListener from "~/hooks/useEventListener";
import useMobile from "~/hooks/useMobile";
import useWindowSize from "~/hooks/useWindowSize";
import type { MenuItem } from "~/types";
import { preventDefault } from "~/utils/events";
import { mapMenuItems } from "../menus/mapMenuItems";
import { mentionDisplayItems } from "../menus/mention";
import { useEditor } from "./EditorContext";

interface Props {
  /** Whether the text direction is right-to-left. */
  rtl: boolean;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Placement extends Rect {
  /** Whether the button is placed over a card rather than an inline mention. */
  isCard: boolean;
}

/**
 * Renders an overflow button on the hovered or selected mention when it can be
 * displayed as a card. The button opens a menu to switch the display. Touch
 * devices have no hover, so they show the button for the selected mention only.
 *
 * @param props - the component props.
 * @returns the button, or null when no such mention is hovered or selected.
 */
export const MentionHoverMenu = observer(function MentionHoverMenu({
  rtl,
}: Props) {
  const editor = useEditor();
  const { view, commands } = editor;
  const { t } = useTranslation();
  const isMobile = useMobile();
  const canHover = !isMobile && !isTouchDevice();
  const [hovered, setHovered] = React.useState<HTMLElement | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [placement, setPlacement] = React.useState<Placement | null>(null);
  const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0);
  const hideTimeout = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const isOpenRef = React.useRef(false);

  const cancelHide = React.useCallback(() => {
    clearTimeout(hideTimeout.current);
  }, []);

  // Hide after a delay so the pointer can cross the gap to the button.
  const scheduleHide = React.useCallback(() => {
    clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => {
      if (!isOpenRef.current) {
        setHovered(null);
      }
    }, hideDelay);
  }, []);

  React.useEffect(() => cancelHide, [cancelHide]);

  // Only the position is derived, so other transactions do not render.
  const selectedPos = useComputed(() => {
    const { selection } = editor.editorState;
    return selection instanceof NodeSelection &&
      canDisplayAsCard(selection.node)
      ? selection.from
      : undefined;
  }, [editor]);
  const selected =
    selectedPos === undefined ? null : getMentionElement(view, selectedPos);
  const element = (canHover ? hovered : null) ?? selected;

  useEventListener(
    "mouseover",
    (event: MouseEvent) => {
      if (!canHover) {
        return;
      }

      const mention =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>(".mention")
          : null;

      if (mention && getMentionPos(view, mention) !== undefined) {
        cancelHide();
        setHovered(mention);
      } else {
        scheduleHide();
      }
    },
    view.dom
  );
  // Scrolling a table moves the mention away from the button, so hide it for
  // a hovered mention and re-measure for a selected one.
  useEventListener(
    "scroll",
    () => {
      if (!isOpenRef.current) {
        cancelHide();
        setHovered(null);
      }
      forceUpdate();
    },
    view.dom,
    { capture: true, passive: true }
  );
  useEventListener(
    "mouseleave",
    (event: MouseEvent) => {
      if (
        event.relatedTarget instanceof Node &&
        wrapperRef.current?.contains(event.relatedTarget)
      ) {
        return;
      }
      scheduleHide();
    },
    view.dom
  );

  // Keep the hover style on the mention while the pointer is on the button.
  React.useEffect(() => {
    if (!element) {
      return;
    }
    element.setAttribute(EditorStyleHelper.mentionMenuTarget, "");
    return () => element.removeAttribute(EditorStyleHelper.mentionMenuTarget);
  }, [element]);

  // Re-measure when the window resizes, the mention changes size (for example
  // when it is switched to a card) or content above it moves it.
  useWindowSize();

  React.useEffect(() => {
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(forceUpdate);
    observer.observe(element);
    observer.observe(view.dom);
    return () => observer.disconnect();
  }, [element, view]);

  // Runs after every render by design, the position comparison prevents a loop.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  React.useLayoutEffect(() => {
    // Close the menu if the mention was removed, for example by a collaborator.
    if (element && !view.dom.contains(element)) {
      isOpenRef.current = false;
      setIsOpen(false);
      setHovered(null);
      return;
    }

    const wrapper = wrapperRef.current;
    if (!element || !wrapper) {
      setPlacement((prev) => (prev === null ? prev : null));
      return;
    }

    const parent = wrapper.offsetParent
      ? wrapper.offsetParent.getBoundingClientRect()
      : { top: 0, left: 0 };
    const isCard = element.dataset.display === MentionDisplay.Card;
    const rect = getPlacement(element, isCard, rtl);
    const next: Placement = {
      isCard,
      top: Math.round(rect.top - parent.top),
      left: Math.round(rect.left - parent.left),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };

    setPlacement((prev) =>
      prev &&
      prev.isCard === next.isCard &&
      prev.top === next.top &&
      prev.left === next.left &&
      prev.width === next.width &&
      prev.height === next.height
        ? prev
        : next
    );
  });

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      isOpenRef.current = open;
      setIsOpen(open);
      if (open) {
        return;
      }

      // The mention may have been replaced by the display change.
      const isHovered =
        hovered?.matches(":hover") || wrapperRef.current?.matches(":hover");
      if (hovered && (!view.dom.contains(hovered) || !isHovered)) {
        setHovered(null);
      }
    },
    [view, hovered]
  );

  const items: MenuItem[] = React.useMemo(() => {
    if (!isOpen || !element) {
      return [];
    }

    // The position is resolved on click, as edits by collaborators can move
    // the mention while the menu is open.
    return mapMenuItems(
      mentionDisplayItems(t, () => getMentionPos(view, element)),
      commands,
      view,
      view.state
    );
  }, [t, isOpen, element, commands, view]);

  if (!element || !view.editable || !view.dom.contains(element)) {
    return null;
  }

  return (
    <Portal>
      <MenuProvider variant="dropdown">
        <Menu open={isOpen} onOpenChange={handleOpenChange}>
          <Wrapper
            ref={wrapperRef}
            style={
              placement
                ? {
                    top: placement.top,
                    left: placement.left,
                    width: placement.width,
                    height: placement.height,
                  }
                : undefined
            }
            $visible={!!placement}
            $inline={!!placement && !placement.isCard}
            $rtl={rtl}
          >
            <MenuTrigger>
              <Button
                aria-label={t("Display options")}
                onMouseEnter={cancelHide}
                onMouseLeave={scheduleHide}
              >
                <MoreIcon size={20} />
              </Button>
            </MenuTrigger>
          </Wrapper>
          <MenuContent
            align={rtl ? "start" : "end"}
            aria-label={t("Display options")}
            onCloseAutoFocus={preventDefault}
          >
            <EventBoundary>{toMenuItems(items)}</EventBoundary>
          </MenuContent>
        </Menu>
      </MenuProvider>
    </Portal>
  );
});

/** Delay in ms before the button hides once the pointer leaves the mention. */
const hideDelay = 150;

/** Size of the button in px. */
const buttonSize = 24;

/** Width of the fade over the mention text before the button in px. */
const fadeWidth = 12;

/** Inset of the button from the corner of a card in px. */
const cardInset = 8;

/**
 * Returns the document position of a mention element when it can be displayed
 * as a card.
 *
 * @param view - the editor view.
 * @param element - the rendered mention element.
 * @returns the position of the mention, or undefined.
 */
function getMentionPos(view: EditorView, element: HTMLElement) {
  if (!view.dom.contains(element)) {
    return undefined;
  }

  const pos = view.posAtDOM(element, 0);
  const node = view.state.doc.nodeAt(pos);
  return node && canDisplayAsCard(node) ? pos : undefined;
}

/**
 * Returns the rendered mention element for a mention at a position.
 *
 * @param view - the editor view.
 * @param pos - the position of the mention.
 * @returns the mention element, or null if it is not rendered.
 */
function getMentionElement(view: EditorView, pos: number) {
  const dom = view.nodeDOM(pos);
  if (!(dom instanceof HTMLElement)) {
    return null;
  }
  return dom.matches(".mention")
    ? dom
    : dom.querySelector<HTMLElement>(".mention");
}

/**
 * Returns the viewport rect of the button area for a mention. Cards place the
 * button in the top corner, inline mentions place it inside the end of the
 * last line, over a fade of the text.
 *
 * @param element - the rendered mention element.
 * @param isCard - whether the mention is displayed as a card.
 * @param rtl - whether the text direction is right-to-left.
 * @returns the viewport rect of the button area.
 */
function getPlacement(
  element: HTMLElement,
  isCard: boolean,
  rtl: boolean
): Rect {
  if (isCard) {
    const bounds = element.getBoundingClientRect();
    return {
      top: bounds.top + cardInset,
      left: rtl
        ? bounds.left + cardInset
        : bounds.right - cardInset - buttonSize,
      width: buttonSize,
      height: buttonSize,
    };
  }

  const rects = element.getClientRects();
  const rect =
    (rtl ? rects[0] : rects[rects.length - 1]) ??
    element.getBoundingClientRect();
  const width = Math.min(fadeWidth + buttonSize, rect.width);
  return {
    top: rect.top,
    left: rtl ? rect.left : rect.right - width,
    width,
    height: rect.height,
  };
}

const Wrapper = styled.div<{
  $visible: boolean;
  $inline: boolean;
  $rtl: boolean;
}>`
  position: absolute;
  top: 0;
  left: -10000px;
  visibility: ${(props) => (props.$visible ? "visible" : "hidden")};
  z-index: ${depths.editorToolbar};
  display: flex;
  align-items: center;
  /* Only the button takes the pointer, so the fade does not block the mention. */
  pointer-events: none;
  justify-content: ${(props) => (props.$rtl ? "flex-start" : "flex-end")};
  ${(props) =>
    props.$inline &&
    `
    border-radius: ${props.$rtl ? "8px 0 0 8px" : "0 8px 8px 0"};
    background: linear-gradient(
      ${props.$rtl ? "to left" : "to right"},
      transparent,
      ${props.theme.mentionHoverBackground} ${fadeWidth}px
    );
  `}

  @media print {
    display: none;
  }
`;

const Button = styled(NudeButton)`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: ${buttonSize}px;
  height: 100%;
  max-height: ${buttonSize}px;
  color: ${s("textSecondary")};
  pointer-events: auto;

  &:hover,
  &[data-state="open"] {
    color: ${s("text")};
  }
`;
