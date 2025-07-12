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
import { ActionV2Variant, ActionV2WithChildren, MenuItem } from "~/types";
import { toDropdownMenuItems, toMobileMenuItems } from "./transformer";

type Props = {
  action: ActionV2WithChildren;
  children: React.ReactNode;
  align?: "start" | "end";
  ariaLabel: string;
  contentAriaLabel?: string;
};

export function DropdownMenu({
  action,
  children,
  align = "start",
  ariaLabel,
  contentAriaLabel,
}: Props) {
  const isMobile = useMobile();
  const contentRef =
    React.useRef<React.ElementRef<typeof DropdownMenuContent>>(null);
  const context = useActionContext({
    isContextMenu: true,
  });
  const menuItems = (action.children as ActionV2Variant[]).map((childAction) =>
    actionV2ToMenuItem(childAction, context)
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
        contentAriaLabel={contentAriaLabel}
      />
    );
  }

  const content = toDropdownMenuItems(menuItems);

  if (!content) {
    return null;
  }

  return (
    <DropdownMenuRoot>
      <DropdownMenuTrigger aria-label={ariaLabel}>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        aria-label={contentAriaLabel ?? ariaLabel}
        onAnimationStart={disablePointerEvents}
        onAnimationEnd={enablePointerEvents}
      >
        {content}
      </DropdownMenuContent>
    </DropdownMenuRoot>
  );
}

type MobileDropdownProps = {
  items: MenuItem[];
  trigger: React.ReactNode;
} & Pick<Props, "ariaLabel" | "contentAriaLabel">;

function MobileDropdown({
  items,
  trigger,
  ariaLabel,
  contentAriaLabel,
}: MobileDropdownProps) {
  const [open, setOpen] = React.useState(false);
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
    setOpen(false);
  }, []);

  const content = toMobileMenuItems(items, closeDrawer);

  if (!content) {
    return null;
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger aria-label={ariaLabel} asChild>
        {trigger}
      </DrawerTrigger>
      <DrawerContent
        ref={contentRef}
        aria-label={contentAriaLabel ?? ariaLabel}
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
