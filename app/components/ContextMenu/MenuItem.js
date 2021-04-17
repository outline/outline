// @flow
import { CheckmarkIcon } from "outline-icons";
import * as React from "react";
import { MenuItem as BaseMenuItem } from "reakit/Menu";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";

type Props = {|
  onClick?: (SyntheticEvent<>) => void | Promise<void>,
  children?: React.Node,
  selected?: boolean,
  disabled?: boolean,
  to?: string,
  href?: string,
  target?: "_blank",
  as?: string | React.ComponentType<*>,
  hide?: () => void,
|};

const MenuItem = ({
  onClick,
  children,
  selected,
  disabled,
  as,
  hide,
  ...rest
}: Props) => {
  const handleClick = React.useCallback(
    (ev) => {
      if (onClick) {
        onClick(ev);
      }
      if (hide) {
        hide();
      }
    },
    [hide, onClick]
  );

  return (
    <BaseMenuItem
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      hide={hide}
      {...rest}
    >
      {(props) => (
        <MenuAnchor
          {...props}
          as={onClick ? "button" : as}
          onClick={handleClick}
        >
          {selected !== undefined && (
            <>
              {selected ? <CheckmarkIcon /> : <Spacer />}
              &nbsp;
            </>
          )}
          {children}
        </MenuAnchor>
      )}
    </BaseMenuItem>
  );
};

const Spacer = styled.div`
  width: 24px;
  height: 24px;
`;

export const MenuAnchor = styled.a`
  display: flex;
  margin: 0;
  border: 0;
  padding: 12px;
  width: 100%;
  min-height: 32px;
  background: none;
  color: ${(props) =>
    props.disabled ? props.theme.textTertiary : props.theme.textSecondary};
  justify-content: left;
  align-items: center;
  font-size: 16px;
  cursor: default;
  user-select: none;

  svg:not(:last-child) {
    margin-right: 4px;
  }

  svg {
    flex-shrink: 0;
    opacity: ${(props) => (props.disabled ? ".5" : 1)};
  }

  ${(props) =>
    props.disabled
      ? "pointer-events: none;"
      : `

  &:hover,
  &.focus-visible {
    color: ${props.theme.white};
    background: ${props.theme.primary};
    box-shadow: none;
    cursor: pointer;

    svg {
      fill: ${props.theme.white};
    }
  }

  &:focus {
    color: ${props.theme.white};
    background: ${props.theme.primary};
  }
  `};

  ${breakpoint("tablet")`
    padding: 6px 12px;
    font-size: 15px;
  `};
`;

export default MenuItem;
