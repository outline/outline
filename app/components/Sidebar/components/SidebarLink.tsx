import { LocationDescriptor } from "history";
import * as React from "react";
import styled, { useTheme, css } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import EventBoundary from "@shared/components/EventBoundary";
import { hover, s } from "@shared/styles";
import { isMobile } from "@shared/utils/browser";
import NudeButton from "~/components/NudeButton";
import { UnreadBadge } from "~/components/UnreadBadge";
import useClickIntent from "~/hooks/useClickIntent";
import { undraggableOnDesktop } from "~/styles";
import Disclosure from "./Disclosure";
import NavLink, { Props as NavLinkProps } from "./NavLink";
import { ActionV2WithChildren } from "~/types";
import { ContextMenu } from "~/components/Menu/ContextMenu";
import { useTranslation } from "react-i18next";
import useBoolean from "~/hooks/useBoolean";

type Props = Omit<NavLinkProps, "to"> & {
  to?: LocationDescriptor;
  innerRef?: (ref: HTMLElement | null | undefined) => void;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  /** Callback when we expect the user to click on the link. Used for prefetching data. */
  onClickIntent?: () => void;
  onDisclosureClick?: React.MouseEventHandler<HTMLButtonElement>;
  icon?: React.ReactNode;
  label?: React.ReactNode;
  menu?: React.ReactNode;
  unreadBadge?: boolean;
  showActions?: boolean;
  disabled?: boolean;
  active?: boolean;
  /** If set, a disclosure will be rendered to the left of any icon */
  expanded?: boolean;
  isActiveDrop?: boolean;
  isDraft?: boolean;
  depth?: number;
  scrollIntoViewIfNeeded?: boolean;
  contextAction?: ActionV2WithChildren;
};

const activeDropStyle = {
  fontWeight: 600,
};

const preventDefault = (ev: React.MouseEvent) => {
  ev.preventDefault();
};

function SidebarLink(
  {
    icon,
    onClick,
    onClickIntent,
    to,
    label,
    active,
    isActiveDrop,
    isDraft,
    menu,
    showActions,
    exact,
    href,
    depth,
    className,
    expanded,
    onDisclosureClick,
    disabled,
    unreadBadge,
    contextAction,
    ...rest
  }: Props,
  ref: React.RefObject<HTMLAnchorElement>
) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { handleMouseEnter, handleMouseLeave } = useClickIntent(onClickIntent);
  const style = React.useMemo(
    () => ({
      paddingLeft: `${(depth || 0) * 16 + 12}px`,
      paddingRight: unreadBadge ? "32px" : undefined,
    }),
    [depth]
  );

  const unreadStyle = React.useMemo(
    () => ({
      right: -12,
    }),
    []
  );

  const activeStyle = React.useMemo(
    () => ({
      color: theme.text,
      background: theme.sidebarActiveBackground,
      ...style,
    }),
    [theme.text, theme.sidebarActiveBackground, style]
  );

  const hoverStyle = React.useMemo(
    () => ({
      color: theme.text,
      ...style,
    }),
    [theme.text, style]
  );

  const [openContextMenu, setOpen, setClosed] = useBoolean(false);
  const DisclosureComponent = depth === 0 ? HiddenDisclosure : Disclosure;

  const handleClickCapture = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (event.altKey && onDisclosureClick && expanded !== undefined) {
        event.preventDefault();
        event.stopPropagation();
        onDisclosureClick(
          event as unknown as React.MouseEvent<HTMLButtonElement>
        );
      }
    },
    [onDisclosureClick, expanded]
  );

  return (
    <>
      <ContextMenu
        action={contextAction}
        ariaLabel={t("Link options")}
        onOpen={setOpen}
        onClose={setClosed}
      >
        <Link
          $isActiveDrop={isActiveDrop}
          $isDraft={isDraft}
          $disabled={disabled}
          activeStyle={isActiveDrop ? activeDropStyle : activeStyle}
          style={openContextMenu ? hoverStyle : active ? activeStyle : style}
          onClickCapture={handleClickCapture}
          onClick={onClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          // @ts-expect-error exact does not exist on div
          exact={exact !== false}
          to={to}
          as={to ? undefined : href ? "a" : "div"}
          href={href}
          className={className}
          ref={ref}
          {...rest}
        >
          <Content>
            {expanded !== undefined && (
              <DisclosureComponent
                expanded={expanded}
                onMouseDown={onDisclosureClick}
                onClick={preventDefault}
                tabIndex={-1}
              />
            )}
            {icon && <IconWrapper>{icon}</IconWrapper>}
            <Label>{label}</Label>
            {unreadBadge && <UnreadBadge style={unreadStyle} />}
          </Content>
        </Link>
      </ContextMenu>
      {menu && <Actions showActions={showActions}>{menu}</Actions>}
    </>
  );
}

// accounts for whitespace around icon
export const IconWrapper = styled.span`
  margin-left: -4px;
  margin-right: 4px;
  height: 24px;
  overflow: hidden;
  flex-shrink: 0;
  transition: opacity 200ms ease-in-out;
`;

const Content = styled.span`
  display: flex;
  align-items: start;
  position: relative;
  width: 100%;
`;

const Actions = styled(EventBoundary)<{ showActions?: boolean }>`
  display: inline-flex;
  visibility: ${(props) => (props.showActions ? "visible" : "hidden")};
  position: absolute;
  top: 4px;
  right: 4px;
  gap: 4px;
  color: ${s("textTertiary")};
  transition: opacity 50ms;
  height: 24px;

  svg {
    color: ${s("textSecondary")};
    fill: currentColor;
    opacity: 0.5;
  }

  &:hover {
    visibility: visible;

    svg {
      opacity: 0.75;
    }
  }
`;

const HiddenDisclosure = styled(Disclosure)`
  position: inherit;
  left: initial;
  display: none;
  margin-left: -2px;
  margin-right: 6px;
`;

const Link = styled(NavLink)<{
  $isActiveDrop?: boolean;
  $isDraft?: boolean;
  $disabled?: boolean;
}>`
  display: flex;
  position: relative;
  text-overflow: ellipsis;
  font-weight: 475;
  padding: ${isMobile() ? 12 : 6}px 16px;
  border-radius: 4px;
  min-height: 32px;
  user-select: none;
  background: ${(props) =>
    props.$isActiveDrop ? props.theme.slateDark : "inherit"};
  color: ${(props) =>
    props.$isActiveDrop ? props.theme.white : props.theme.sidebarText};
  font-size: 16px;
  cursor: var(--pointer);
  overflow: hidden;
  ${undraggableOnDesktop()}

  ${(props) =>
    props.$disabled &&
    css`
      pointer-events: none;
      opacity: 0.75;
    `}

  ${(props) =>
    props.$isDraft &&
    css`
      &:after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        border-radius: 4px;
        border: 1.5px dashed ${props.theme.sidebarDraftBorder};
      }
    `}

  svg {
    ${(props) => (props.$isActiveDrop ? `fill: ${props.theme.white};` : "")}
    transition: fill 50ms;
  }

  &: ${hover} {
    ${HiddenDisclosure} {
      display: block;
    }
    ${HiddenDisclosure} + ${IconWrapper} {
      visibility: hidden;
      opacity: 0;
      width: 0;
    }
  }

  & + ${Actions} {
    background: ${s("sidebarBackground")};

    ${NudeButton} {
      background: transparent;

      &:hover,
      &[aria-expanded="true"] {
        background: ${s("sidebarControlHoverBackground")};
      }
    }
  }

  &[aria-current="page"] + ${Actions} {
    background: ${s("sidebarActiveBackground")};
  }

  ${breakpoint("tablet")`
    padding: 4px 8px 4px 16px;
    font-size: 14px;
  `}

  @media (hover: hover) {
    &:hover + ${Actions}, &:active + ${Actions} {
      visibility: visible;

      svg {
        opacity: 0.75;
      }
    }

    &:hover {
      color: ${(props) =>
        props.$isActiveDrop ? props.theme.white : props.theme.text};
    }
  }
`;

const Label = styled.div`
  position: relative;
  width: 100%;
  line-height: 24px;

  * {
    unicode-bidi: plaintext;
  }
`;

export default React.forwardRef<HTMLAnchorElement, Props>(SidebarLink);
