import * as React from "react";
import { actionToMenuItem, resolve } from "~/actions";
import useActionContext from "~/hooks/useActionContext";
import useMobile from "~/hooks/useMobile";
import type { ActionFactory, ActionVariant, ActionWithChildren } from "~/types";
import { preventDefault } from "~/utils/events";
import { toMenuItems } from "./transformer";
import { observer } from "mobx-react";
import { useComputed } from "~/hooks/useComputed";
import { Menu, MenuContent, MenuTrigger } from "~/components/primitives/Menu";
import { MenuProvider } from "~/components/primitives/Menu/MenuContext";

type Props = {
  /** Root action with children representing the menu items */
  action?: ActionWithChildren | ActionFactory;
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
    const [open, setOpen] = React.useState(false);
    const isMobile = useMobile();
    const contentRef = React.useRef<React.ElementRef<typeof MenuContent>>(null);
    const actionContext = useActionContext({
      isMenu: true,
    });

    // Menu items are only built while the menu is open.
    const menuItems = useComputed(() => {
      if (!open) {
        return [];
      }

      const resolvedAction = typeof action === "function" ? action() : action;
      if (!resolvedAction) {
        return [];
      }

      // children may be a factory function, so resolve it before mapping.
      return resolve<ActionVariant[]>(
        resolvedAction.children,
        actionContext
      ).map((childAction) => actionToMenuItem(childAction, actionContext));
    }, [open, action, actionContext]);

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

    // For non-factory actions we can cheaply detect an empty menu without
    // resolving any items (actionToMenuItem is length-preserving).
    const childActions =
      typeof action === "function" ? undefined : action?.children;
    const isEmpty =
      typeof action !== "function" &&
      (Array.isArray(childActions) ? childActions.length === 0 : !childActions);

    if (isMobile || !action || isEmpty) {
      return <>{children}</>;
    }

    const content = open ? toMenuItems(menuItems) : null;

    return (
      <MenuProvider variant="context">
        <Menu open={open} onOpenChange={handleOpenChange}>
          <MenuTrigger aria-label={ariaLabel}>{children}</MenuTrigger>
          <MenuContent
            aria-label={ariaLabel}
            onAnimationStart={disablePointerEvents}
            onAnimationEnd={enablePointerEvents}
            onCloseAutoFocus={preventDefault}
          >
            {content}
          </MenuContent>
        </Menu>
      </MenuProvider>
    );
  }
);
