// @flow
import * as React from "react";
import { withRouter, type RouterHistory, type Match } from "react-router-dom";
import styled, { withTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import EventBoundary from "components/EventBoundary";
import NavLink from "./NavLink";
import { type Theme } from "types";

type Props = {
  to?: string | Object,
  href?: string | Object,
  innerRef?: (?HTMLElement) => void,
  onClick?: (SyntheticEvent<>) => void,
  onMouseEnter?: (SyntheticEvent<>) => void,
  className?: string,
  children?: React.Node,
  icon?: React.Node,
  label?: React.Node,
  menu?: React.Node,
  showActions?: boolean,
  iconColor?: string,
  active?: boolean,
  isActiveDrop?: boolean,
  history: RouterHistory,
  match: Match,
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
  depth,
  history,
  match,
  className,
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

  const activeDropStyle = {
    fontWeight: 600,
  };

  return (
    <>
      <Link
        $isActiveDrop={isActiveDrop}
        activeStyle={isActiveDrop ? activeDropStyle : activeStyle}
        style={active ? activeStyle : style}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        exact={exact !== false}
        to={to}
        as={to ? undefined : href ? "a" : "div"}
        href={href}
        className={className}
      >
        {icon && <IconWrapper>{icon}</IconWrapper>}
        <Label>{label}</Label>
      </Link>
      {menu && <Actions showActions={showActions}>{menu}</Actions>}
    </>
  );
}

// accounts for whitespace around icon
const IconWrapper = styled.span`
  margin-left: -4px;
  margin-right: 4px;
  height: 24px;
  overflow: hidden;
  flex-shrink: 0;
`;

const Actions = styled(EventBoundary)`
  display: ${(props) => (props.showActions ? "inline-flex" : "none")};
  position: absolute;
  top: 4px;
  right: 4px;
  color: ${(props) => props.theme.textTertiary};
  transition: opacity 50ms;

  svg {
    color: ${(props) => props.theme.textSecondary};
    fill: currentColor;
    opacity: 0.5;
  }

  &:hover {
    display: inline-flex;

    svg {
      opacity: 0.75;
    }
  }
`;

const Link = styled(NavLink)`
  display: flex;
  position: relative;
  text-overflow: ellipsis;
  padding: 6px 16px;
  border-radius: 4px;
  transition: background 50ms, color 50ms;
  background: ${(props) =>
    props.$isActiveDrop ? props.theme.slateDark : "inherit"};
  color: ${(props) =>
    props.$isActiveDrop ? props.theme.white : props.theme.sidebarText};
  font-size: 16px;
  cursor: pointer;
  overflow: hidden;

  svg {
    ${(props) => (props.$isActiveDrop ? `fill: ${props.theme.white};` : "")}
    transition: fill 50ms;
  }

  &:hover {
    color: ${(props) =>
      props.$isActiveDrop ? props.theme.white : props.theme.text};
  }

  &:focus {
    color: ${(props) => props.theme.text};
    background: ${(props) => props.theme.black05};
  }

  &:hover + ${Actions},
  &:active + ${Actions} {
      display: inline-flex;

      svg {
        opacity: 0.75;
      }
    }
  }

  ${breakpoint("tablet")`
    padding: 4px 32px 4px 16px;
    font-size: 15px;
  `}
`;

const Label = styled.div`
  position: relative;
  width: 100%;
  max-height: 4.8em;
  line-height: 1.6;
`;

export default withRouter(withTheme(SidebarLink));
