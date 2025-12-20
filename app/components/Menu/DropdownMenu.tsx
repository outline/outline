import * as React from "react";
import type * as TooltipPrimitive from "@radix-ui/react-tooltip";
import styled from "styled-components";
import Scrollable from "~/components/Scrollable";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/primitives/Drawer";
import { Menu, MenuContent, MenuTrigger } from "~/components/primitives/Menu";
import { MenuProvider } from "~/components/primitives/Menu/MenuContext";
import { actionToMenuItem } from "~/actions";
import useActionContext from "~/hooks/useActionContext";
import useMobile from "~/hooks/useMobile";
import type {
  ActionVariant,
  ActionWithChildren,
  MenuItem,
  MenuItemWithChildren,
} from "~/types";
import { toMenuItems, toMobileMenuItems } from "./transformer";
import { observer } from "mobx-react";
import { useComputed } from "~/hooks/useComputed";

type Props = {
  /** Root action with children representing the menu items */
  action: ActionWithChildren;
  /** Trigger for the menu */
  children: React.ReactNode;
  /** Alignment w.r.t trigger - defaults to start */
  align?: "start" | "end";
  /** ARIA label for the menu */
  ariaLabel: string;
  /** Additional component to display at the bottom of the top-level menu */
  append?: React.ReactNode;
  /** Callback when menu is opened */
  onOpen?: () => void;
  /** Callback when menu is closed */
  onClose?: () => void;
  // TODO: Invert the dependency chain by forwarding dropdown ref and props to Tooltip component
} & React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>;

export const DropdownMenu = observer(
  React.forwardRef<React.ElementRef<typeof TooltipPrimitive.Trigger>, Props>(
    (
      {
        action,
        children,
        align = "start",
        ariaLabel,
        append,
        onOpen,
        onClose,
        ...rest
      },
      ref
    ) => {
      const [open, setOpen] = React.useState(false);
      const isMobile = useMobile();
      const contentRef =
        React.useRef<React.ElementRef<typeof MenuContent>>(null);
      const actionContext = useActionContext({
        isMenu: true,
      });

      const menuItems = useComputed(() => {
        if (!open) {
          return [];
        }

        return (action.children as ActionVariant[]).map((childAction) =>
          actionToMenuItem(childAction, actionContext)
        );
      }, [open, action.children, actionContext]);

      const handleOpenChange = React.useCallback(
        (open: boolean) => {
          setOpen(open);
          if (open) {
            onOpen?.();
          } else {
            onClose?.();
          }
        },
        [onOpen, onClose]
      );

      const enablePointerEvents = React.useCallback(() => {
        if (contentRef.current) {
          contentRef.current.style.pointerEvents = "auto";
        }
      }, []);

      const disablePointerEvents = React.useCallback(() => {
        if (contentRef.current) {
          contentRef.current.style.pointerEvents = "none";
        }
      }, []);

      const handleCloseAutoFocus = React.useCallback(
        (e: Event) => e.preventDefault(),
        []
      );

      if (isMobile) {
        return (
          <MobileDropdown
            open={open}
            onOpenChange={handleOpenChange}
            items={menuItems}
            trigger={children}
            ariaLabel={ariaLabel}
            append={append}
          />
        );
      }

      const content = toMenuItems(menuItems);

      return (
        <MenuProvider variant="dropdown">
          <Menu open={open} onOpenChange={handleOpenChange}>
            <MenuTrigger ref={ref} aria-label={ariaLabel} {...rest}>
              {children}
            </MenuTrigger>
            <MenuContent
              align={align}
              aria-label={ariaLabel}
              onAnimationStart={disablePointerEvents}
              onAnimationEnd={enablePointerEvents}
              onCloseAutoFocus={handleCloseAutoFocus}
            >
              {content}
              {append}
            </MenuContent>
          </Menu>
        </MenuProvider>
      );
    }
  )
);

type MobileDropdownProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: MenuItem[];
  trigger: React.ReactNode;
} & Pick<Props, "ariaLabel" | "append">;

function MobileDropdown({
  open,
  onOpenChange,
  items,
  trigger,
  ariaLabel,
  append,
}: MobileDropdownProps) {
  const [submenuName, setSubmenuName] = React.useState<string>();
  const contentRef = React.useRef<React.ElementRef<typeof DrawerContent>>(null);

  const enablePointerEvents = React.useCallback(() => {
    if (contentRef.current) {
      contentRef.current.style.pointerEvents = "auto";
    }
  }, []);

  const disablePointerEvents = React.useCallback(() => {
    if (contentRef.current) {
      contentRef.current.style.pointerEvents = "none";
    }
  }, []);

  const closeDrawer = React.useCallback(() => {
    onOpenChange(false);
    setTimeout(() => setSubmenuName(undefined), 500); // needed for a Vaul bug where 'onAnimationEnd' is not called for controlled state.
  }, [onOpenChange]);

  const resetSubmenu = React.useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setSubmenuName(undefined);
    }
  }, []);

  const menuItems = React.useMemo(() => {
    if (!items.length || !submenuName) {
      return items;
    }

    const submenu = items.find(
      (item) =>
        item.type === "submenu" && (item.title as string) === submenuName
    )! as MenuItemWithChildren;

    return submenu.items;
  }, [items, submenuName]);

  const content = toMobileMenuItems(menuItems, closeDrawer, setSubmenuName);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      onAnimationEnd={resetSubmenu}
    >
      <DrawerTrigger aria-label={ariaLabel} asChild>
        {trigger}
      </DrawerTrigger>
      <DrawerContent
        ref={contentRef}
        aria-label={ariaLabel}
        aria-describedby={undefined}
        onAnimationStart={disablePointerEvents}
        onAnimationEnd={enablePointerEvents}
      >
        <DrawerTitle>{ariaLabel}</DrawerTitle>
        <StyledScrollable hiddenScrollbars>
          {content}
          {!submenuName ? append : null}
        </StyledScrollable>
      </DrawerContent>
    </Drawer>
  );
}

const StyledScrollable = styled(Scrollable)`
  max-height: 75vh;
`;
