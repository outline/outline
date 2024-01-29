import * as React from "react";
import scrollIntoView from "smooth-scroll-into-view-if-needed";
import styled from "styled-components";
import MenuItem from "~/components/ContextMenu/MenuItem";
import { usePortalContext } from "~/components/Portal";

export type Props = {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon?: React.ReactElement;
  title: React.ReactNode;
  shortcut?: string;
};

function SuggestionsMenuItem({
  selected,
  disabled,
  onClick,
  title,
  shortcut,
  icon,
}: Props) {
  const portal = usePortalContext();
  const ref = React.useCallback(
    (node) => {
      if (selected && node) {
        void scrollIntoView(node, {
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
      icon={icon}
    >
      {title}
      {shortcut && <Shortcut $active={selected}>{shortcut}</Shortcut>}
    </MenuItem>
  );
}

const Shortcut = styled.span<{ $active?: boolean }>`
  color: ${(props) =>
    props.$active ? props.theme.white50 : props.theme.textTertiary};
  flex-grow: 1;
  text-align: right;
`;

export default SuggestionsMenuItem;
