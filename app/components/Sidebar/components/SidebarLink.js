// @flow
import * as React from "react";
import { withRouter, NavLink } from "react-router-dom";
import styled, { withTheme } from "styled-components";
import { type Theme } from "types";

type Props = {
  to?: string | Object,
  href?: string | Object,
  innerRef?: (?HTMLElement) => void,
  onClick?: (SyntheticEvent<>) => void,
  onMouseEnter?: (SyntheticEvent<>) => void,
  children?: React.Node,
  icon?: React.Node,
  label?: React.Node,
  menu?: React.Node,
  showActions?: boolean,
  iconColor?: string,
  active?: boolean,
  isActiveDrop?: boolean,
  theme: Theme,
  exact?: boolean,
  depth?: number,
};

function SidebarLink({
  icon,
  children,
  onClick,
  onMouseEnter,
  to,
  label,
  active,
  isActiveDrop,
  menu,
  showActions,
  theme,
  exact,
  href,
  innerRef,
  depth,
  ...rest
}: Props) {
  const style = React.useMemo(() => {
    return {
      paddingLeft: `${(depth || 0) * 16 + 16}px`,
    };
  }, [depth]);

  const activeStyle = {
    fontWeight: 600,
    color: theme.text,
    background: theme.sidebarItemBackground,
    ...style,
  };

  const activeFontWeightOnly = {
    fontWeight: 600,
  };

  return (
    <StyledNavLink
      $isActiveDrop={isActiveDrop}
      activeStyle={isActiveDrop ? activeFontWeightOnly : activeStyle}
      style={active ? activeStyle : style}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      exact={exact !== false}
      to={to}
      as={to ? undefined : href ? "a" : "div"}
      href={href}
      ref={innerRef}
    >
      {icon && <IconWrapper>{icon}</IconWrapper>}
      <Label>{label}</Label>
      {menu && <Actions showActions={showActions}>{menu}</Actions>}
    </StyledNavLink>
  );
}

// accounts for whitespace around icon
const IconWrapper = styled.span`
  margin-left: -4px;
  margin-right: 4px;
  height: 24px;
`;

const Actions = styled.span`
  display: ${(props) => (props.showActions ? "inline-flex" : "none")};
  position: absolute;
  top: 4px;
  right: 4px;
  color: ${(props) => props.theme.textTertiary};
  opacity: 0.75;
  transition: opacity 50ms;

  svg {
    opacity: 0.75;
  }

  &:hover {
    svg {
      opacity: 1;
    }
  }
`;

const StyledNavLink = styled(NavLink)`
  display: flex;
  position: relative;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 4px 16px;
  border-radius: 4px;
  transition: background 50ms, color 50ms;
  background: ${(props) =>
    props.$isActiveDrop ? props.theme.slateDark : "inherit"};
  color: ${(props) =>
    props.$isActiveDrop ? props.theme.white : props.theme.sidebarText};
  font-size: 15px;
  cursor: pointer;

  svg {
    ${(props) => (props.$isActiveDrop ? `fill: ${props.theme.white};` : "")}
    transition: fill 50ms
  }

  &:hover {
    color: ${(props) =>
      props.$isActiveDrop ? props.theme.white : props.theme.text};
  }

  &:focus {
    color: ${(props) => props.theme.text};
    background: ${(props) => props.theme.black05};
  }

  &:hover,
  &:active {
    > ${Actions} {
      opacity: 1;
      display: inline-flex;
    }
  }
`;

const Label = styled.div`
  position: relative;
  width: 100%;
  max-height: 4.8em;
  line-height: 1.6;
`;

export default withRouter(withTheme(SidebarLink));
