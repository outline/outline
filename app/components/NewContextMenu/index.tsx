"use client";

import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import * as React from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { Drawer } from "vaul";
import { depths, s } from "@shared/styles";
import useMobile from "~/hooks/useMobile";
import { mobileContextMenu, fadeAndScaleIn, fadeIn } from "~/styles/animations";

const ContextMenu: React.FC<
  React.ComponentProps<typeof ContextMenuPrimitive.Root & typeof Drawer.Root>
> = ({ ...props }) => {
  const isMobile = useMobile();

  return isMobile ? (
    <Drawer.Root {...props} />
  ) : (
    <ContextMenuPrimitive.Root {...props} />
  );
};
ContextMenu.displayName = ContextMenuPrimitive.Root.displayName;

const ContextMenuTrigger = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Trigger & typeof Drawer.Trigger>,
  React.ComponentPropsWithoutRef<
    typeof ContextMenuPrimitive.Trigger & typeof Drawer.Trigger
  >
>(({ ...props }, ref) => {
  const isMobile = useMobile();

  return isMobile ? (
    <Drawer.Trigger ref={ref} {...props} />
  ) : (
    <ContextMenuPrimitive.Trigger ref={ref} {...props} />
  );
});
ContextMenuTrigger.displayName = ContextMenuPrimitive.Trigger.displayName;

const DrawerPosition = styled.div`
  position: fixed !important;
  top: auto !important;
  right: 8px !important;
  bottom: 0 !important;
  left: 8px !important;
  z-index: ${depths.menu};
`;

const DragHint = styled.div`
  margin-left: auto;
  margin-right: auto;
  margin-bottom: 6px;
  width: 3rem;
  height: 0.375rem;
  border-radius: 0.1875rem;
  background-color: ${s("drawerDragHint")};
`;

const DrawerOverlay = styled(Drawer.Overlay)`
  animation: ${fadeIn} 200ms ease-in-out;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${s("backdrop")};
  z-index: ${depths.menu - 1};
`;

const ContextMenuPrimitiveContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Content & typeof Drawer.Content>,
  React.ComponentPropsWithoutRef<
    typeof ContextMenuPrimitive.Content & typeof Drawer.Content
  >
>(({ ...props }, ref) => {
  const isMobile = useMobile();

  return isMobile ? (
    <Drawer.Portal>
      <DrawerOverlay />
      <DrawerPosition>
        <Drawer.Content ref={ref} {...props}>
          <DragHint />
          {props.children}
        </Drawer.Content>
      </DrawerPosition>
    </Drawer.Portal>
  ) : (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content ref={ref} {...props} />
    </ContextMenuPrimitive.Portal>
  );
});
ContextMenuPrimitiveContent.displayName =
  ContextMenuPrimitive.Content.displayName;

const ContextMenuContent = styled(ContextMenuPrimitiveContent)`
  z-index: ${depths.menu};
  animation: ${mobileContextMenu} 200ms ease;
  transform-origin: 50% 100%;
  max-width: 100%;
  background: ${s("menuBackground")};
  border-radius: 6px 6px 0 0;
  padding: 6px;
  min-width: 180px;
  min-height: 44px;
  max-height: 75vh;
  pointer-events: all;
  font-weight: normal;

  @media print {
    display: none;
  }

  ${breakpoint("tablet")`
    animation: ${fadeAndScaleIn} 200ms ease;
    max-width: 276px;
    max-height: 100vh;
    background: ${s("menuBackground")};
    box-shadow: ${s("menuShadow")};
    border-radius: 6px;
  `};
`;

const ContextMenuPrimitiveItem = React.forwardRef<
  | React.ElementRef<typeof ContextMenuPrimitive.Item>
  | React.LegacyRef<HTMLAnchorElement>,
  | React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item>
  | React.ComponentPropsWithoutRef<"a">
>(({ ...props }, ref) => {
  const isMobile = useMobile();

  return isMobile ? (
    <a
      ref={ref as React.LegacyRef<HTMLAnchorElement>}
      {...(props as React.ComponentPropsWithRef<"a">)}
      onClick={(e) =>
        props.onSelect?.(
          e as unknown as Event & React.SyntheticEvent<HTMLAnchorElement>
        )
      }
    />
  ) : (
    <ContextMenuPrimitive.Item
      ref={ref as React.Ref<HTMLDivElement>}
      {...(props as React.ComponentPropsWithoutRef<
        typeof ContextMenuPrimitive.Item
      >)}
    />
  );
});
ContextMenuPrimitiveItem.displayName = ContextMenuPrimitive.Item.displayName;

type ContextMenuItemProps = {
  level?: number;
  disabled?: boolean;
  dangerous?: boolean;
  disclosure?: boolean;
  $active?: boolean;
};

const ContextMenuItem = styled(ContextMenuPrimitiveItem)<ContextMenuItemProps>`
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
        background: ${
          props.dangerous ? props.theme.danger : props.theme.accent
        };
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
    padding-right: ${(props: ContextMenuItemProps) =>
      props.disclosure ? 32 : 12}px;
    font-size: 14px;
  `}
`;

export { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem };
