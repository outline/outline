import * as React from "react";
import {
  ContextMenu as ContextMenuRoot,
  ContextMenuTrigger,
  ContextMenuContent,
} from "~/components/primitives/ContextMenu";
import { actionV2ToMenuItem } from "~/actions";
import useActionContext from "~/hooks/useActionContext";
import useMobile from "~/hooks/useMobile";
import { ActionContext, ActionV2Variant, ActionV2WithChildren } from "~/types";
import { toContextMenuItems } from "./transformer";
import { observer } from "mobx-react";
import { useComputed } from "~/hooks/useComputed";

type Props = {
  /** Root action with children representing the menu items */
  action: ActionV2WithChildren;
  /** Action context to use - new context will be created if not provided */
  context?: ActionContext;
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
  ({ action, children, ariaLabel, context, onOpen, onClose }: Props) => {
    const isMobile = useMobile();
    const contentRef =
      React.useRef<React.ElementRef<typeof ContextMenuContent>>(null);

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
      return <>{children}</>;
    }

    const content = toContextMenuItems(menuItems);

    return (
      <ContextMenuRoot onOpenChange={handleOpenChange}>
        <ContextMenuTrigger aria-label={ariaLabel}>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent
          aria-label={ariaLabel}
          onAnimationStart={disablePointerEvents}
          onAnimationEnd={enablePointerEvents}
          onCloseAutoFocus={handleCloseAutoFocus}
        >
          {content}
        </ContextMenuContent>
      </ContextMenuRoot>
    );
  }
);
