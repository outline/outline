import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";
import { RemoveScroll } from "react-remove-scroll";
import EventBoundary from "@shared/components/EventBoundary";
import { collapseSelection } from "@shared/editor/commands/collapseSelection";
import type { MenuItem } from "@shared/editor/types";
import { useTranslation } from "react-i18next";
import { toMenuItems } from "~/components/Menu/transformer";
import * as Components from "~/components/primitives/components/Menu";
import { MenuProvider } from "~/components/primitives/Menu/MenuContext";
import { mapMenuItems } from "../menus/mapMenuItems";
import { useEditor } from "./EditorContext";
import { useInlineMenuAnchor } from "./useInlineMenuAnchor";

type Props = {
  items: MenuItem[];
  /** Whether the document is right-to-left. */
  rtl: boolean;
};

// The virtual anchor is an invisible zero-size element; the hook positions it
// over the selection and Radix anchors the menu to it.
const anchorStyle: React.CSSProperties = {
  position: "fixed",
  width: 0,
  height: 0,
};

/**
 * Renders a selection-toolbar menu inline — a vertical menu anchored to the
 * selection with no trigger button — by holding a Radix dropdown `open`
 * against a virtual anchor positioned over the selection. Radix provides the
 * positioning, collision handling, submenus, and keyboard navigation. Page
 * scroll is locked while open (via RemoveScroll, as Radix does for modal
 * menus) without enabling Radix's modal mode, which conflicts with the menu
 * being opened by an editor selection rather than a trigger.
 */
const InlineMenu: React.FC<Props> = ({ items, rtl }) => {
  const { t } = useTranslation();
  const { commands, view } = useEditor();
  const { state } = view;
  const {
    ref: anchorRef,
    key: anchorKey,
    side,
    align,
    sideOffset,
  } = useInlineMenuAnchor(rtl);

  const mapped = React.useMemo(
    () => mapMenuItems(items, commands, view, state),
    [items, commands, view, state]
  );

  const preventFocus = React.useCallback((ev: Event) => {
    ev.preventDefault();
  }, []);

  // Dismiss the menu by collapsing the selection so the toolbar stops matching.
  const handleDismiss = React.useCallback(() => {
    collapseSelection()(view.state, view.dispatch);
  }, [view]);

  return (
    <MenuProvider variant="dropdown">
      <DropdownMenuPrimitive.Root key={anchorKey} open modal={false}>
        <DropdownMenuPrimitive.Trigger asChild>
          <div ref={anchorRef} aria-hidden style={anchorStyle} />
        </DropdownMenuPrimitive.Trigger>
        <DropdownMenuPrimitive.Portal>
          <DropdownMenuPrimitive.Content
            side={side}
            align={align}
            sideOffset={sideOffset}
            collisionPadding={6}
            aria-label={t("Options")}
            onCloseAutoFocus={preventFocus}
            onInteractOutside={handleDismiss}
            onEscapeKeyDown={handleDismiss}
            asChild
          >
            <RemoveScroll as={Slot} allowPinchZoom>
              <Components.MenuContent
                maxHeightVar="--radix-dropdown-menu-content-available-height"
                transformOriginVar="--radix-dropdown-menu-content-transform-origin"
                hiddenScrollbars
              >
                <EventBoundary>{toMenuItems(mapped)}</EventBoundary>
              </Components.MenuContent>
            </RemoveScroll>
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      </DropdownMenuPrimitive.Root>
    </MenuProvider>
  );
};

export default InlineMenu;
