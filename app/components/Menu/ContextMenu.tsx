import * as React from "react";
import { actionToMenuItem } from "~/actions";
import useActionContext from "~/hooks/useActionContext";
import useMobile from "~/hooks/useMobile";
import { ActionVariant, ActionWithChildren } from "~/types";
import { toMenuItems } from "./transformer";
import { observer } from "mobx-react";
import { useComputed } from "~/hooks/useComputed";
import { Menu, MenuContent, MenuTrigger } from "~/components/primitives/Menu";
import { MenuProvider } from "~/components/primitives/Menu/MenuContext";

type Props = {
  /** Root action with children representing the menu items */
  action?: ActionWithChildren;
  /** Trigger for the menu */
  children: React.ReactNode;
  /** ARIA label for the menu */
  ariaLabel: string;
  /** Callback when menu is opened */
  onOpen?: () => void;
  /** Callback when menu is closed */
  onClose?: () => void;
};

export const ContextMenu = observer(
  ({ action, children, ariaLabel, onOpen, onClose }: Props) => {
    const isMobile = useMobile();
    const contentRef = React.useRef<React.ElementRef<typeof MenuContent>>(null);
    const actionContext = useActionContext({
      isMenu: true,
    });

    const menuItems = useComputed(
      () =>
        ((action?.children as ActionVariant[]) ?? []).map((childAction) =>
          actionToMenuItem(childAction, actionContext)
        ),
      [action?.children, actionContext]
    );

    const handleOpenChange = React.useCallback(
      (open: boolean) => {
        if (open) {
          onOpen?.();
        } else {
          onClose?.();
        }
      },
      [open, onOpen, onClose]
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

    if (isMobile || !action || menuItems.length === 0) {
      return <>{children}</>;
    }

    const content = toMenuItems(menuItems);

    return (
      <MenuProvider variant="context">
        <Menu onOpenChange={handleOpenChange}>
          <MenuTrigger aria-label={ariaLabel}>{children}</MenuTrigger>
          <MenuContent
            aria-label={ariaLabel}
            onAnimationStart={disablePointerEvents}
            onAnimationEnd={enablePointerEvents}
            onCloseAutoFocus={handleCloseAutoFocus}
          >
            {content}
          </MenuContent>
        </Menu>
      </MenuProvider>
    );
  }
);
