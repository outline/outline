import * as React from "react";
import scrollIntoView from "smooth-scroll-into-view-if-needed";
import styled, { useTheme } from "styled-components";

export type Props = {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon?: typeof React.Component | React.FC<any>;
  title: React.ReactNode;
  shortcut?: string;
  containerId?: string;
};

function BlockMenuItem({
  selected,
  disabled,
  onClick,
  title,
  shortcut,
  icon,
  containerId = "block-menu-container",
}: Props) {
  const Icon = icon;
  const theme = useTheme();

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
      selected={selected}
      onClick={disabled ? undefined : onClick}
      ref={ref}
    >
      {Icon && (
        <>
          <Icon
            color={
              selected ? theme.blockToolbarIconSelected : theme.blockToolbarIcon
            }
          />
          &nbsp;&nbsp;
        </>
      )}
      {title}
      {shortcut && <Shortcut>{shortcut}</Shortcut>}
    </MenuItem>
  );
}

const Shortcut = styled.span`
  color: ${(props) => props.theme.textTertiary};
  flex-grow: 1;
  text-align: right;
`;

const MenuItem = styled.button<{
  selected: boolean;
}>`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  font-weight: 500;
  font-size: 14px;
  line-height: 1;
  width: 100%;
  height: 36px;
  cursor: pointer;
  border: none;
  opacity: ${(props) => (props.disabled ? ".5" : "1")};
  color: ${(props) =>
    props.selected
      ? props.theme.blockToolbarTextSelected
      : props.theme.blockToolbarText};
  background: ${(props) =>
    props.selected
      ? props.theme.blockToolbarSelectedBackground ||
        props.theme.blockToolbarTrigger
      : "none"};
  padding: 0 16px;
  outline: none;

  &:active {
    color: ${(props) => props.theme.blockToolbarTextSelected};
    background: ${(props) =>
      props.selected
        ? props.theme.blockToolbarSelectedBackground ||
          props.theme.blockToolbarTrigger
        : props.theme.blockToolbarHoverBackground};

    ${Shortcut} {
      color: ${(props) => props.theme.textSecondary};
    }
  }
`;

export default BlockMenuItem;
