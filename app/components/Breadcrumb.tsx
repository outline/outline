import { GoToIcon } from "outline-icons";
import { observer } from "mobx-react";
import * as React from "react";
import { mergeRefs } from "react-merge-refs";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import { s, ellipsis } from "@shared/styles";
import Flex from "~/components/Flex";
import BreadcrumbMenu from "~/menus/BreadcrumbMenu";
import { undraggableOnDesktop } from "~/styles";
import type { InternalLinkAction, MenuInternalLink } from "~/types";
import { actionToMenuItem } from "~/actions";
import useActionContext from "~/hooks/useActionContext";
import { useComputed } from "~/hooks/useComputed";

type TopLevelAction =
  | InternalLinkAction
  | { type: "menu"; actions: InternalLinkAction[] };

type Props = React.PropsWithChildren<{
  actions: InternalLinkAction[];
  /**
   * Maximum number of items to display regardless of available space. When
   * undefined the number of visible items is based solely on the width
   * available to the component.
   */
  max?: number;
  highlightFirstItem?: boolean;
}>;

/** Width of the slash separator icon, in pixels. */
const SLASH_WIDTH = 24;

/** Space occupied by the overflow menu button – 32px wide with -4px inline margins. */
const MENU_WIDTH = 24;

/** Total negative inline margin applied to a breadcrumb item. */
const ITEM_MARGIN = 8;

/** Negative inline margin of the first item, which has no start margin. */
const FIRST_ITEM_MARGIN = 4;

/** Buffer to account for sub-pixel rounding when measuring. */
const SAFETY_MARGIN = 1;

/**
 * A responsive breadcrumb that renders a list of link actions separated by
 * slashes. Items that do not fit into the available horizontal space are
 * collapsed into an overflow menu after the first item, keeping the items
 * closest to the current location visible.
 */
function Breadcrumb(
  { actions, highlightFirstItem, children, max }: Props,
  ref: React.RefObject<HTMLDivElement> | null
) {
  const actionContext = useActionContext({ isMenu: true });

  const visibleActions = useComputed(
    () =>
      actions.filter((action) =>
        typeof action.visible === "function"
          ? action.visible(actionContext)
          : (action.visible ?? true)
      ),
    [actions, actionContext]
  );
  const totalVisibleActions = visibleActions.length;
  const hasChildren = !!children;

  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const measurerRef = React.useRef<HTMLDivElement | null>(null);
  const childrenRef = React.useRef<HTMLSpanElement | null>(null);
  const itemRefs = React.useRef<(HTMLElement | null)[]>([]);
  const countRef = React.useRef(0);
  const hasChildrenRef = React.useRef(false);
  const maxRef = React.useRef<number | undefined>(undefined);

  // Number of trailing items displayed after the overflow menu, or null when
  // every item fits and no overflow menu is needed.
  const [overflowTail, setOverflowTail] = React.useState<number | null>(null);

  React.useLayoutEffect(() => {
    countRef.current = totalVisibleActions;
    hasChildrenRef.current = hasChildren;
    maxRef.current = max;
  });

  // Measures the natural width of each item from the hidden measurement row
  // and the space available from the parent container, then determines how
  // many items can be shown before collapsing the remainder into a menu.
  const recompute = React.useCallback(() => {
    const root = rootRef.current;
    const parent = root?.parentElement;
    const count = countRef.current;

    if (!root || !parent || count === 0) {
      setOverflowTail(null);
      return;
    }

    const widths: number[] = [];
    for (let i = 0; i < count; i++) {
      const el = itemRefs.current[i];
      if (!el) {
        return;
      }
      widths.push(el.getBoundingClientRect().width);
    }

    const parentStyle = window.getComputedStyle(parent);
    let available =
      parent.clientWidth -
      parseFloat(parentStyle.paddingLeft) -
      parseFloat(parentStyle.paddingRight) -
      SAFETY_MARGIN;

    // Subtract space taken by siblings, ex: the mobile sidebar menu button.
    for (const sibling of Array.from(parent.children)) {
      if (sibling !== root && sibling instanceof HTMLElement) {
        const siblingStyle = window.getComputedStyle(sibling);
        available -=
          sibling.getBoundingClientRect().width +
          parseFloat(siblingStyle.marginLeft) +
          parseFloat(siblingStyle.marginRight);
      }
    }

    const itemWidth = (index: number) =>
      widths[index] - (index === 0 ? FIRST_ITEM_MARGIN : ITEM_MARGIN);

    const childrenWidth =
      hasChildrenRef.current && childrenRef.current
        ? SLASH_WIDTH + childrenRef.current.getBoundingClientRect().width
        : 0;

    const maxItems = maxRef.current ?? Infinity;

    let total = childrenWidth;
    for (let i = 0; i < count; i++) {
      total += (i === 0 ? 0 : SLASH_WIDTH) + itemWidth(i);
    }

    let next: number | null = null;

    // Collapsing is only worthwhile with more than two items – with two or
    // fewer the menu would be empty, so items shrink and truncate instead.
    if ((total > available || count > maxItems) && count > 2) {
      let used = itemWidth(0) + SLASH_WIDTH + MENU_WIDTH + childrenWidth;
      let tail = 0;

      // Keep the items nearest the current location, walking backwards while
      // they fit. Index 1 always remains in the menu, otherwise showing every
      // item would have been possible in less space.
      for (let i = count - 1; i >= 2; i--) {
        const width = used + SLASH_WIDTH + itemWidth(i);
        if (width > available || tail + 2 > maxItems) {
          break;
        }
        used = width;
        tail++;
      }

      // Always show the item closest to the current location, even if it must
      // shrink to fit.
      next = Math.max(tail, 1);
    }

    setOverflowTail((prev) => (prev === next ? prev : next));
  }, []);

  React.useLayoutEffect(() => {
    recompute();
  }, [recompute, totalVisibleActions, max, hasChildren]);

  React.useLayoutEffect(() => {
    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => recompute());
    const parent = rootRef.current?.parentElement;
    if (parent) {
      observer.observe(parent);
    }
    if (measurerRef.current) {
      observer.observe(measurerRef.current);
    }

    return () => observer.disconnect();
  }, [recompute]);

  const topLevelActions: TopLevelAction[] = React.useMemo(() => {
    if (
      overflowTail === null ||
      totalVisibleActions <= 2 ||
      overflowTail > totalVisibleActions - 2
    ) {
      return [...visibleActions];
    }

    // Chop the middle breadcrumbs and present a "…" menu instead, keeping the
    // first item and the items closest to the current location.
    const result: TopLevelAction[] = [...visibleActions];
    const menuActions = result.splice(
      1,
      totalVisibleActions - 1 - overflowTail
    ) as InternalLinkAction[];

    result.splice(1, 0, {
      type: "menu",
      actions: menuActions,
    });
    return result;
  }, [visibleActions, overflowTail, totalVisibleActions]);

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (event.currentTarget.querySelector('[data-state="open"]')) {
        event.preventDefault();
      }
    },
    []
  );

  const toBreadcrumb = React.useCallback(
    (action: TopLevelAction, index: number) => {
      if (action.type === "menu") {
        return <BreadcrumbMenu key="menu" actions={action.actions} />;
      }

      const item = actionToMenuItem(action, actionContext) as MenuInternalLink;

      return (
        <Item
          to={item.to}
          onClick={handleClick}
          $highlight={!!highlightFirstItem && index === 0}
        >
          {item.icon}
          <Title>{item.title}</Title>
        </Item>
      );
    },
    [actionContext, handleClick, highlightFirstItem]
  );

  return (
    <Wrapper
      justify="flex-start"
      align="center"
      ref={mergeRefs([ref, rootRef])}
    >
      {topLevelActions.map((action, index) => (
        <React.Fragment key={action.type === "menu" ? "menu" : `item-${index}`}>
          {toBreadcrumb(action, index)}
          {index !== topLevelActions.length - 1 || !!children ? (
            <Slash />
          ) : null}
        </React.Fragment>
      ))}
      {children ? (
        <ChildrenGroup ref={childrenRef}>{children}</ChildrenGroup>
      ) : null}
      {totalVisibleActions > 0 ? (
        <MeasurerClip aria-hidden>
          <Measurer ref={measurerRef}>
            {visibleActions.map((action, index) => {
              const item = actionToMenuItem(
                action,
                actionContext
              ) as MenuInternalLink;

              return (
                <MeasureItem
                  key={`measure-${index}`}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  $highlight={!!highlightFirstItem && index === 0}
                >
                  {item.icon}
                  <Title>{item.title}</Title>
                </MeasureItem>
              );
            })}
          </Measurer>
        </MeasurerClip>
      ) : null}
    </Wrapper>
  );
}

const Wrapper = styled(Flex)`
  position: relative;
`;

const Slash = styled(GoToIcon)`
  flex-shrink: 0;
  fill: ${s("divider")};
`;

const itemStyle = css<{ $highlight: boolean }>`
  ${undraggableOnDesktop()}

  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 1;
  min-width: 0;
  cursor: var(--pointer);
  color: ${s("text")};
  font-size: 15px;
  height: 32px;
  font-weight: ${(props) => (props.$highlight ? "500" : "inherit")};
  padding-inline: 8px;
  border-radius: 4px;
  margin-inline: -4px;

  &:first-child {
    margin-inline-start: 0;
  }
  max-width: 460px;
  transition: background 100ms ease-in-out;

  &:hover,
  &:has([data-state="open"]) {
    background: ${s("buttonNeutralHoverBackground")};
    transition: none;
  }
`;

const Item = styled(Link)<{ $highlight: boolean }>`
  ${itemStyle}
`;

// Hidden copy of a breadcrumb item used to measure its natural width, it must
// share styles with Item so that measurements match the real thing.
const MeasureItem = styled.span<{ $highlight: boolean }>`
  ${itemStyle}
  flex-shrink: 0;
`;

// Zero-sized clipping container so the measurement row never contributes to
// the scrollable overflow of the page.
const MeasurerClip = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  overflow: hidden;
`;

const Measurer = styled.div`
  display: flex;
  align-items: center;
  width: max-content;
  visibility: hidden;
  pointer-events: none;
`;

const ChildrenGroup = styled.span`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
`;

const Title = styled.span`
  ${ellipsis()}
  min-width: 0;
`;

export default observer(React.forwardRef<HTMLDivElement, Props>(Breadcrumb));
