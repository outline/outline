import { CheckmarkIcon } from "outline-icons";
import * as React from "react";
import { MenuItem as BaseMenuItem } from "reakit/Menu";
import styled, { css } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import MenuIconWrapper from "../MenuIconWrapper";

type Props = {
  onClick?: (event: React.SyntheticEvent) => void | Promise<void>;
  selected?: boolean;
  disabled?: boolean;
  dangerous?: boolean;
  to?: string;
  href?: string;
  target?: "_blank";
  as?: string | React.ComponentType<any>;
  hide?: () => void;
  level?: number;
  icon?: React.ReactElement;
};

const MenuItem: React.FC<Props> = ({
  onClick,
  children,
  selected,
  disabled,
  as,
  hide,
  icon,
  ...rest
}) => {
  const handleClick = React.useCallback(
    (ev) => {
      if (onClick) {
        ev.preventDefault();
        ev.stopPropagation();
        onClick(ev);
      }

      if (hide) {
        hide();
      }
    },
    [onClick, hide]
  );

  // Preventing default mousedown otherwise menu items do not work in Firefox,
  // which triggers the hideOnClickOutside handler first via mousedown – hiding
  // and un-rendering the menu contents.
  const handleMouseDown = React.useCallback((ev) => {
    ev.preventDefault();
    ev.stopPropagation();
  }, []);

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
          $toggleable={selected !== undefined}
          as={onClick ? "button" : as}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
        >
          {selected !== undefined && (
            <>
              {selected ? <CheckmarkIcon color="currentColor" /> : <Spacer />}
              &nbsp;
            </>
          )}
          {icon && (
            <MenuIconWrapper>
              {React.cloneElement(icon, { color: "currentColor" })}
            </MenuIconWrapper>
          )}
          {children}
        </MenuAnchor>
      )}
    </BaseMenuItem>
  );
};

const Spacer = styled.svg`
  width: 24px;
  height: 24px;
  flex-shrink: 0;
`;

type MenuAnchorProps = {
  level?: number;
  disabled?: boolean;
  dangerous?: boolean;
  disclosure?: boolean;
};

export const MenuAnchorCSS = css<MenuAnchorProps>`
  display: flex;
  margin: 0;
  border: 0;
  padding: 12px;
  padding-left: ${(props) => 12 + (props.level || 0) * 10}px;
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
  white-space: nowrap;
  position: relative;

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

  @media (hover: hover) {
    &:hover,
    &:focus,
    &.focus-visible {
      color: ${props.theme.white};
      background: ${props.dangerous ? props.theme.danger : props.theme.primary};
      box-shadow: none;
      cursor: pointer;

      svg {
        fill: ${props.theme.white};
      }
    }
  }
  `};

  ${breakpoint("tablet")`
    padding: 4px 12px;
    padding-right: ${(props: MenuAnchorProps) =>
      props.disclosure ? 32 : 12}px;
    font-size: 14px;
  `};
`;

export const MenuAnchor = styled.a`
  ${MenuAnchorCSS}
`;

export default MenuItem;
