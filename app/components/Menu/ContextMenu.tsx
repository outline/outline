import * as React from "react";
import { actionToMenuItem } from "~/actions";
import useActionContext from "~/hooks/useActionContext";
import useMobile from "~/hooks/useMobile";
import type { ActionVariant, ActionWithChildren } from "~/types";
import { preventDefault } from "~/utils/events";
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

    const [open, setOpen] = React.useState(false);

    // Menu items must only be built while the menu is open. Resolving every
    // action's title, icon and visibility (including translations) is
    // expensive, and the closed branch reads no observables so store changes
    // don't invalidate it.
    const menuItems = useComputed(
      () =>
        open
          ? ((action?.children as ActionVariant[]) ?? []).map((childAction) =>
              actionToMenuItem(childAction, actionContext)
            )
          : [],
      [open, action?.children, actionContext]
    );

    const handleOpenChange = React.useCallback(
      (nextOpen: boolean) => {
        setOpen(nextOpen);
        if (nextOpen) {
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

    // actionToMenuItem is length-preserving, so the raw children count decides
    // emptiness without resolving any items.
    const childActions = action?.children;
    const isEmpty = Array.isArray(childActions)
      ? childActions.length === 0
      : !childActions;

    if (isMobile || !action || isEmpty) {
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
            onCloseAutoFocus={preventDefault}
          >
            {content}
          </MenuContent>
        </Menu>
      </MenuProvider>
    );
  }
);
