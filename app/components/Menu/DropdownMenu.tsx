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

type Props = {
  action: ActionV2WithChildren;
  context?: ActionContext;
  children: React.ReactNode;
  align?: "start" | "end";
  ariaLabel: string;
  onOpen?: () => void;
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
  const menuItems = (action.children as ActionV2Variant[]).map((childAction) =>
    actionV2ToMenuItem(childAction, actionContext)
  );

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

  if (isMobile) {
    return (
      <MobileDropdown
        items={menuItems}
        trigger={children}
        ariaLabel={ariaLabel}
      />
    );
  }

  const content = toDropdownMenuItems(menuItems);

  if (!content) {
    return null;
  }

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
      >
        {content}
      </DropdownMenuContent>
    </DropdownMenuRoot>
  );
});

type MobileDropdownProps = {
  items: MenuItem[];
  trigger: React.ReactNode;
} & Pick<Props, "ariaLabel" | "onOpen" | "onClose">;

function MobileDropdown({
  items,
  trigger,
  ariaLabel,
  onOpen,
  onClose,
}: MobileDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const [submenuName, setSubmenuName] = React.useState<string>();
  const contentRef = React.useRef<React.ElementRef<typeof DrawerContent>>(null);

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

  const closeDrawer = React.useCallback(() => {
    handleOpenChange(false);
    setTimeout(() => setSubmenuName(undefined), 500); // needed for a Vaul bug where 'onAnimationEnd' is not called for controlled state.
  }, [handleOpenChange]);

  const resetSubmenu = React.useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setSubmenuName(undefined);
    }
  }, []);

  const menuItems = React.useMemo(() => {
    if (!submenuName) {
      return items;
    }

    const submenu = items.find(
      (item) =>
        item.type === "submenu" && (item.title as string) === submenuName
    )! as MenuItemWithChildren;

    return submenu.items;
  }, [items, submenuName]);

  const content = toMobileMenuItems(menuItems, closeDrawer, setSubmenuName);

  if (!content) {
    return null;
  }

  return (
    <Drawer open={open} onOpenChange={setOpen} onAnimationEnd={resetSubmenu}>
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
        <StyledScrollable hiddenScrollbars>{content}</StyledScrollable>
      </DrawerContent>
    </Drawer>
  );
}

const StyledScrollable = styled(Scrollable)`
  max-height: 75vh;
`;
