import { LocationDescriptor } from "history";
import * as React from "react";
import styled, { useTheme, css } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s } from "@shared/styles";
import { NavigationNode } from "@shared/types";
import { Emoji } from "~/components/EmojiPicker";
import EventBoundary from "~/components/EventBoundary";
import NudeButton from "~/components/NudeButton";
import useEmojiWidth from "~/hooks/useEmojiWidth";
import useUnmount from "~/hooks/useUnmount";
import { undraggableOnDesktop } from "~/styles";
import Disclosure from "./Disclosure";
import NavLink, { Props as NavLinkProps } from "./NavLink";

export type DragObject = NavigationNode & {
  depth: number;
  active: boolean;
  collectionId: string;
};

type Props = Omit<NavLinkProps, "to"> & {
  to?: LocationDescriptor;
  innerRef?: (ref: HTMLElement | null | undefined) => void;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  /* Callback when we expect the user to click on the link. Used for prefetching data. */
  onClickIntent?: () => void;
  onDisclosureClick?: React.MouseEventHandler<HTMLButtonElement>;
  icon?: React.ReactNode;
  emoji?: string | null;
  label?: React.ReactNode;
  menu?: React.ReactNode;
  showActions?: boolean;
  disabled?: boolean;
  active?: boolean;
  /* If set, a disclosure will be rendered to the left of any icon */
  expanded?: boolean;
  isActiveDrop?: boolean;
  isDraft?: boolean;
  depth?: number;
  scrollIntoViewIfNeeded?: boolean;
};

const activeDropStyle = {
  fontWeight: 600,
};

function SidebarLink(
  {
    icon,
    onClick,
    onClickIntent,
    to,
    emoji,
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
    ...rest
  }: Props,
  ref: React.RefObject<HTMLAnchorElement>
) {
  const timer = React.useRef<number>();
  const theme = useTheme();
  const style = React.useMemo(
    () => ({
      paddingLeft: `${(depth || 0) * 16 + 12}px`,
    }),
    [depth]
  );

  const activeStyle = React.useMemo(
    () => ({
      fontWeight: 600,
      color: theme.text,
      background: theme.sidebarActiveBackground,
      ...style,
    }),
    [theme.text, theme.sidebarActiveBackground, style]
  );

  const emojiWidth = useEmojiWidth(emoji, {
    fontSize: "15px",
    lineHeight: "1.6",
  });
  const handleMouseEnter = React.useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }

    if (onClickIntent) {
      timer.current = window.setTimeout(onClickIntent, 100);
    }
  }, [onClickIntent]);

  const handleMouseLeave = React.useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
  }, []);

  useUnmount(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
  });

  return (
    <>
      <Link
        $isActiveDrop={isActiveDrop}
        $isDraft={isDraft}
        $disabled={disabled}
        activeStyle={isActiveDrop ? activeDropStyle : activeStyle}
        style={active ? activeStyle : style}
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
            <Disclosure
              expanded={expanded}
              onClick={onDisclosureClick}
              root={depth === 0}
              tabIndex={-1}
            />
          )}
          {icon && <IconWrapper>{icon}</IconWrapper>}
          {emoji && (
            <EmojiWrapper width={emojiWidth}>
              <Emoji align="center">{emoji}</Emoji>
            </EmojiWrapper>
          )}
          <Label>{label}</Label>
        </Content>
      </Link>
      {menu && <Actions showActions={showActions}>{menu}</Actions>}
    </>
  );
}

const Content = styled.span`
  display: flex;
  align-items: start;
  position: relative;
  width: 100%;

  ${Disclosure} {
    margin-top: 2px;
  }
`;

// accounts for whitespace around icon
export const IconWrapper = styled.span`
  margin-left: -4px;
  margin-right: 4px;
  height: 24px;
  overflow: hidden;
  flex-shrink: 0;
`;

const EmojiWrapper = styled(IconWrapper)<{ width?: number }>`
  margin-right: 0;
  width: ${(props) => (props.width ? `${props.width}px` : "100%")};
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

const Link = styled(NavLink)<{
  $isActiveDrop?: boolean;
  $isDraft?: boolean;
  $disabled?: boolean;
}>`
  display: flex;
  position: relative;
  text-overflow: ellipsis;
  padding: 6px 16px;
  border-radius: 4px;
  min-height: 32px;
  transition: background 50ms, color 50ms;
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

  &:hover svg {
    display: inline;
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

  &:hover {
    ${Disclosure} {
      opacity: 1;
    }
  }
`;

const Label = styled.div`
  position: relative;
  width: 100%;
  max-height: 4.8em;
  line-height: 24px;

  * {
    unicode-bidi: plaintext;
  }
`;

export default React.forwardRef<HTMLAnchorElement, Props>(SidebarLink);
