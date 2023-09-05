import { LocationDescriptor } from "history";
import { CheckmarkIcon } from "outline-icons";
import * as React from "react";
import { mergeRefs } from "react-merge-refs";
import { MenuItem as BaseMenuItem } from "reakit/Menu";
import styled, { css } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import MenuIconWrapper from "./MenuIconWrapper";

type Props = {
  id?: string;
  onClick?: (event: React.SyntheticEvent) => void | Promise<void>;
  active?: boolean;
  selected?: boolean;
  disabled?: boolean;
  dangerous?: boolean;
  to?: LocationDescriptor;
  href?: string;
  target?: "_blank";
  as?: string | React.ComponentType<any>;
  hide?: () => void;
  level?: number;
  icon?: React.ReactElement;
  children?: React.ReactNode;
  ref?: React.LegacyRef<HTMLButtonElement> | undefined;
};

const MenuItem = (
  {
    onClick,
    children,
    active,
    selected,
    disabled,
    as,
    hide,
    icon,
    ...rest
  }: Props,
  ref: React.Ref<HTMLAnchorElement>
) => {
  const content = React.useCallback(
    (props) => {
      const handleClick = async (ev: React.MouseEvent) => {
        hide?.();

        if (onClick) {
          ev.preventDefault();
          await onClick(ev);
        }
      };

      // Preventing default mousedown otherwise menu items do not work in Firefox,
      // which triggers the hideOnClickOutside handler first via mousedown – hiding
      // and un-rendering the menu contents.
      const handleMouseDown = (ev: React.MouseEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
      };

      return (
        <MenuAnchor
          {...props}
          $active={active}
          as={onClick ? "button" : as}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          ref={mergeRefs([
            ref,
            props.ref as React.RefObject<HTMLAnchorElement>,
          ])}
        >
          {selected !== undefined && (
            <>
              {selected ? <CheckmarkIcon /> : <Spacer />}
              &nbsp;
            </>
          )}
          {icon && <MenuIconWrapper>{icon}</MenuIconWrapper>}
          {children}
        </MenuAnchor>
      );
    },
    [active, as, hide, icon, onClick, ref, children, selected]
  );

  return (
    <BaseMenuItem
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      hide={hide}
      {...rest}
    >
      {content}
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
  $active?: boolean;
};

export const MenuAnchorCSS = css<MenuAnchorProps>`
  display: flex;
  margin: 0;
  border: 0;
  padding: 12px;
  border-radius: 4px;
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

  ${(props) => props.disabled && "pointer-events: none;"}

  ${(props) =>
    props.$active === undefined &&
    !props.disabled &&
    `
  @media (hover: hover) {
    &:hover,
    &:focus,
    &.focus-visible {
      color: ${props.theme.accentText};
      background: ${props.dangerous ? props.theme.danger : props.theme.accent};
      box-shadow: none;
      cursor: var(--pointer);

      svg {
        fill: ${props.theme.accentText};
      }
    }
  }
  `}

  ${(props) =>
    props.$active &&
    !props.disabled &&
    `
      color: ${props.theme.accentText};
      background: ${props.dangerous ? props.theme.danger : props.theme.accent};
      box-shadow: none;
      cursor: var(--pointer);

      svg {
        fill: ${props.theme.accentText};
      }
    `}

  ${breakpoint("tablet")`
    padding: 4px 12px;
    padding-right: ${(props: MenuAnchorProps) =>
      props.disclosure ? 32 : 12}px;
    font-size: 14px;
  `}
`;

export const MenuAnchor = styled.a`
  ${MenuAnchorCSS}
`;

export default React.forwardRef<HTMLAnchorElement, Props>(MenuItem);
