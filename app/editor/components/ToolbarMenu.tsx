import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import * as Toolbar from "@radix-ui/react-toolbar";
import { closeHistory } from "@shared/editor/lib/closeHistory";
import { MenuItemGroup, type MenuItem } from "@shared/editor/types";
import { hideScrollbars, s } from "@shared/styles";
import { TooltipProvider } from "~/components/TooltipContext";
import useMobile from "~/hooks/useMobile";
import type { MenuItem as TMenuItem } from "~/types";
import { mapMenuItems } from "../menus/mapMenuItems";
import { useEditor } from "./EditorContext";
import { MediaDimension } from "./MediaDimension";
import ToolbarButton from "./ToolbarButton";
import ToolbarSeparator from "./ToolbarSeparator";
import Tooltip from "./Tooltip";
import { toMenuItems } from "~/components/Menu/transformer";
import { MenuContent } from "~/components/primitives/Menu";
import { MenuProvider } from "~/components/primitives/Menu/MenuContext";
import { Menu, MenuTrigger } from "~/components/primitives/Menu";
import { useTranslation } from "react-i18next";
import EventBoundary from "@shared/components/EventBoundary";

type Props = {
  items: MenuItem[];
};

type ToolbarDropdownProps = {
  active: boolean;
  item: MenuItem;
  tooltip?: string;
  shortcut?: string;
};

/**
 * Renders a dropdown menu in the floating toolbar.
 */
function ToolbarDropdown(props: ToolbarDropdownProps) {
  const { commands, view } = useEditor();
  const { t } = useTranslation();
  const { item, shortcut, tooltip } = props;
  const { state } = view;
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
  }, []);

  const items: TMenuItem[] = useMemo(() => {
    if (!isOpen) {
      return [];
    }

    const resolvedItemChildren =
      typeof item.children === "function" ? item.children() : item.children;
    return resolvedItemChildren
      ? mapMenuItems(resolvedItemChildren, commands, view, state)
      : [];
    // Menu items are resolved against the editor state at the moment the menu
    // opens, recomputing on every transaction would rebuild the open menu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, commands]);

  const handleCloseAutoFocus = useCallback((ev: Event) => {
    ev.stopImmediatePropagation();
  }, []);

  return (
    <Tooltip shortcut={shortcut} content={tooltip} disabled={isOpen}>
      <MenuProvider variant="dropdown">
        <Menu open={isOpen} onOpenChange={handleOpenChange}>
          <MenuTrigger>
            <ToolbarButton
              data-group={item.group}
              aria-label={item.label ? undefined : item.tooltip}
              disabled={item.disabled}
            >
              {item.label && <Label>{item.label}</Label>}
              {item.icon}
            </ToolbarButton>
          </MenuTrigger>
          <MenuContent
            align="end"
            aria-label={item.tooltip || t("More options")}
            onCloseAutoFocus={handleCloseAutoFocus}
          >
            <EventBoundary>{toMenuItems(items)}</EventBoundary>
          </MenuContent>
        </Menu>
      </MenuProvider>
    </Tooltip>
  );
}

function ToolbarMenu(props: Props) {
  const { commands, view } = useEditor();
  const { items } = props;
  const { state } = view;
  const isMobile = useMobile();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hasSelection = !state.selection.empty;

  // On mobile the toolbar is a single bar holding both the text and the block
  // controls, wider than the screen. It scrolls to the group that suits the
  // selection – text controls once there is a selection, block controls for a
  // bare cursor – leaving the other group one swipe away.
  const didScroll = useRef(false);
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!isMobile || !wrapper) {
      return;
    }

    const target = wrapper.querySelector(
      `[data-group="${hasSelection ? MenuItemGroup.inline : MenuItemGroup.block}"]`
    );
    target?.scrollIntoView({
      block: "nearest",
      inline: "start",
      behavior: didScroll.current ? "smooth" : "auto",
    });
    didScroll.current = true;
  }, [isMobile, hasSelection]);

  const handleClick = (item: MenuItem) => () => {
    if (!item.name) {
      return;
    }

    // if item has an associated onClick prop, run it
    if (item.onClick) {
      item.onClick();
      return;
    }

    // otherwise, run the associated editor command
    closeHistory(view);
    commands[item.name](
      typeof item.attrs === "function" ? item.attrs(state) : item.attrs
    );
    closeHistory(view);
  };

  return (
    <TooltipProvider>
      <Toolbar.Root asChild>
        <FlexibleWrapper ref={wrapperRef}>
          {items.map((item, index) => {
            if (item.name === "separator" && item.visible !== false) {
              // The mobile bar spaces its buttons evenly instead, as dividers
              // would eat into the room for them.
              return isMobile ? null : <ToolbarSeparator key={index} />;
            }
            if (item.visible === false || (!item.skipIcon && !item.icon)) {
              return null;
            }
            const isActive = item.active ? item.active(state) : false;

            if (item.children) {
              return (
                <ToolbarDropdown
                  key={index}
                  active={isActive && !item.label}
                  item={item}
                  tooltip={
                    item.label === item.tooltip ? undefined : item.tooltip
                  }
                  shortcut={item.shortcut}
                />
              );
            }

            return (
              <Tooltip
                key={index}
                shortcut={item.shortcut}
                content={item.label === item.tooltip ? undefined : item.tooltip}
              >
                {item.name === "dimensions" ? (
                  <MediaDimension key={index} />
                ) : (
                  <Toolbar.Button asChild>
                    <ToolbarButton
                      data-group={item.group}
                      onClick={handleClick(item)}
                      active={isActive && !item.label}
                      aria-label={item.label ? undefined : item.tooltip}
                      disabled={item.disabled}
                    >
                      {item.label && <Label>{item.label}</Label>}
                      {item.icon}
                    </ToolbarButton>
                  </Toolbar.Button>
                )}
              </Tooltip>
            );
          })}
        </FlexibleWrapper>
      </Toolbar.Root>
    </TooltipProvider>
  );
}

const FlexibleWrapper = styled.div`
  color: ${s("textSecondary")};
  overflow: hidden;
  display: flex;
  gap: 6px;
  padding: 6px;

  ${breakpoint("mobile", "tablet")`
    justify-content: space-evenly;
    align-items: center;
    overflow-x: auto;
    scroll-padding-inline-start: 4px;
    padding: 0;

    // Six buttons and half of the seventh fill the width – the half button is
    // what tells the user that the bar scrolls. Whatever is left over becomes
    // the space between them, so the first and last sit hard against the ends
    // and the bar keeps an even margin all round.
    gap: 0 calc((100% - 20px) / 6 - 40px);

    > * {
      display: flex;
      justify-content: center;
      flex: 0 0 auto;
      min-width: 40px;
    }

    > * > button {
      min-width: 40px;
      height: 40px;
      justify-content: center;
      border-radius: 20px;
    }

    ${hideScrollbars()}
  `}
`;

const Label = styled.span`
  font-size: 15px;
  font-weight: 500;
  color: ${s("text")};
`;

export default ToolbarMenu;
