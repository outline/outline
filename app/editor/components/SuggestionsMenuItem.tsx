import * as React from "react";
import scrollIntoView from "scroll-into-view-if-needed";
import styled from "styled-components";
import MenuItem from "~/components/ContextMenu/MenuItem";
import { usePortalContext } from "~/components/Portal";

export type Props = {
  /** Whether the item is selected */
  selected: boolean;
  /** Whether the item is disabled */
  disabled?: boolean;
  /** Callback when the item is clicked */
  onClick: (event: React.SyntheticEvent) => void;
  /** Callback when the item is hovered */
  onPointerMove?: (event: React.SyntheticEvent) => void;
  /** An optional icon for the item */
  icon?: React.ReactNode;
  /** The title of the item */
  title: React.ReactNode;
  /** An optional subtitle for the item */
  subtitle?: React.ReactNode;
  /** A string representing the keyboard shortcut for the item */
  shortcut?: string;
};

function SuggestionsMenuItem({
  selected,
  disabled,
  onClick,
  onPointerMove,
  title,
  subtitle,
  shortcut,
  icon,
}: Props) {
  const portal = usePortalContext();
  const ref = React.useCallback(
    (node) => {
      if (selected && node) {
        scrollIntoView(node, {
          scrollMode: "if-needed",
          block: "nearest",
          boundary: (parent) =>
            // All the parent elements of your target are checked until they
            // reach the portal context. Prevents body and other parent
            // elements from being scrolled
            parent !== portal,
        });
      }
    },
    [selected, portal]
  );

  return (
    <MenuItem
      ref={ref}
      active={selected}
      onClick={disabled ? undefined : onClick}
      onPointerMove={disabled ? undefined : onPointerMove}
      icon={icon}
    >
      {title}
      {subtitle && <Subtitle $active={selected}>&middot; {subtitle}</Subtitle>}
      {shortcut && <Shortcut $active={selected}>{shortcut}</Shortcut>}
    </MenuItem>
  );
}

const Subtitle = styled.span<{ $active?: boolean }>`
  color: ${(props) =>
    props.$active ? props.theme.white50 : props.theme.textTertiary};
`;

const Shortcut = styled.span<{ $active?: boolean }>`
  color: ${(props) =>
    props.$active ? props.theme.white50 : props.theme.textTertiary};
  flex-grow: 1;
  text-align: right;
`;

export default SuggestionsMenuItem;
