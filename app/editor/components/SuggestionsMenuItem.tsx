import * as React from "react";
import scrollIntoView from "smooth-scroll-into-view-if-needed";
import styled from "styled-components";
import MenuItem from "~/components/ContextMenu/MenuItem";

export type Props = {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon?: React.ReactElement;
  title: React.ReactNode;
  shortcut?: string;
  containerId?: string;
};

function SuggestionsMenuItem({
  selected,
  disabled,
  onClick,
  title,
  shortcut,
  icon,
  containerId = "block-menu-container",
}: Props) {
  const ref = React.useCallback(
    (node) => {
      if (selected && node) {
        scrollIntoView(node, {
          scrollMode: "if-needed",
          block: "nearest",
          boundary: (parent) => {
            // All the parent elements of your target are checked until they
            // reach the #block-menu-container. Prevents body and other parent
            // elements from being scrolled
            return parent.id !== containerId;
          },
        });
      }
    },
    [selected, containerId]
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
