// @flow
import { CheckmarkIcon } from "outline-icons";
import * as React from "react";
import { MenuItem as BaseMenu } from "reakit/Menu";
import styled from "styled-components";

type Props = {
  onClick?: (SyntheticEvent<>) => void | Promise<void>,
  children?: React.Node,
  selected?: boolean,
  disabled?: boolean,
  as?: React.Node,
};

const MenuItem = ({
  onClick,
  children,
  selected,
  disabled,
  as,
  ...rest
}: Props) => {
  return (
    <BaseMenu
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      {...rest}
    >
      {(props) => (
        <MenuAnchor as={as} {...props}>
          {selected !== undefined && (
            <>
              {selected ? <CheckmarkIcon /> : <Spacer />}
              &nbsp;
            </>
          )}
          {children}
        </MenuAnchor>
      )}
    </BaseMenu>
  );
};

const Spacer = styled.div`
  width: 24px;
  height: 24px;
`;

export const MenuAnchor = styled.a`
  display: flex;
  margin: 0;
  padding: 6px 12px;
  width: 100%;
  min-height: 32px;

  color: ${(props) =>
    props.disabled ? props.theme.textTertiary : props.theme.textSecondary};
  justify-content: left;
  align-items: center;
  font-size: 15px;
  cursor: default;
  user-select: none;

  svg:not(:last-child) {
    margin-right: 8px;
  }

  svg {
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
`;

export default MenuItem;
