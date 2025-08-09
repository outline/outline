import * as React from "react";
import styled from "styled-components";
import Scrollable from "~/components/Scrollable";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/primitives/Drawer";
import {
  DropdownMenu as DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "~/components/primitives/DropdownMenu";
import { actionV2ToMenuItem } from "~/actions";
import useActionContext from "~/hooks/useActionContext";
import useMobile from "~/hooks/useMobile";
import {
  ActionContext,
  ActionV2Variant,
  ActionV2WithChildren,
  MenuItem,
  MenuItemWithChildren,
} from "~/types";
import { toDropdownMenuItems, toMobileMenuItems } from "./transformer";
import { observer } from "mobx-react";
import { useComputed } from "~/hooks/useComputed";

type Props = {
  /** Root action with children representing the menu items */
  action: ActionV2WithChildren;
  /** Action context to use - new context will be created if not provided */
  context?: ActionContext;
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
};

export const DropdownMenu = observer(function DropdownMenu({
  action,
  context,
  children,
  align = "start",
  ariaLabel,
  onOpen,
  onClose,
  append,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const isMobile = useMobile();
  const contentRef =
    React.useRef<React.ElementRef<typeof DropdownMenuContent>>(null);

  const actionContext =
    context ??
    useActionContext({
      isContextMenu: true,
    });

  const menuItems = useComputed(() => {
    if (!open) {
      return [];
    }

    return (action.children as ActionV2Variant[]).map((childAction) =>
      actionV2ToMenuItem(childAction, actionContext)
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

  const content = toDropdownMenuItems(menuItems);

  return (
    <DropdownMenuRoot open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger aria-label={ariaLabel}>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        aria-label={ariaLabel}
        onAnimationStart={disablePointerEvents}
        onAnimationEnd={enablePointerEvents}
        onCloseAutoFocus={handleCloseAutoFocus}
      >
        {content}
        {append}
      </DropdownMenuContent>
    </DropdownMenuRoot>
  );
});

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
