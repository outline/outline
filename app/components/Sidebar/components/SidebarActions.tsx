import styled, { css } from "styled-components";
import EventBoundary from "@shared/components/EventBoundary";
import { s } from "@shared/styles";
import NudeButton from "~/components/NudeButton";

/**
 * Selector list matching a sidebar row that is hovered, pressed, or has one
 * of its menus open. Radix marks the open trigger with `data-state="open"`:
 * the row itself for a context menu, a descendant button for a dropdown.
 */
export const hoveredOrMenuOpen = `&:hover, &:active, &[data-state="open"], &:has([data-state="open"])`;

/**
 * Trailing action buttons for a sidebar row. Hidden until the row reveals
 * them, see `revealActionsOnHover`. The parent must be positioned.
 */
export const SidebarActions = styled(EventBoundary)<{
  $showActions?: boolean;
}>`
  display: inline-flex;
  visibility: ${(props) => (props.$showActions ? "visible" : "hidden")};
  position: absolute;
  inset-block: 0;
  inset-inline-end: 4px;
  margin-block: auto;
  height: 24px;
  color: ${s("textTertiary")};
  background: var(--background);
  transition: opacity 50ms;

  [data-drag-active] & {
    display: none;
  }

  svg {
    color: ${s("textSecondary")};
    fill: currentColor;
    opacity: 0.5;
  }

  &:hover {
    visibility: visible;

    svg {
      opacity: 0.75;
    }
  }

  ${NudeButton} {
    background: transparent;

    &:hover,
    &[aria-expanded="true"] {
      background: ${s("sidebarControlHoverBackground")};
    }
  }
`;

/**
 * Mixin for a sidebar row that reveals its `SidebarActions` while hovered,
 * focused, or while one of its menus is open.
 */
export const revealActionsOnHover = css`
  @media (hover: hover) {
    ${hoveredOrMenuOpen},
    &:focus-within {
      ${SidebarActions} {
        visibility: visible;

        svg {
          opacity: 0.75;
        }
      }
    }
  }
`;
