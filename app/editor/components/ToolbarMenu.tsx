import { useCallback, useMemo, useState } from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import * as Toolbar from "@radix-ui/react-toolbar";
import type { MenuItem } from "@shared/editor/types";
import { hideScrollbars, s } from "@shared/styles";
import { TooltipProvider } from "~/components/TooltipContext";
import type { MenuItem as TMenuItem } from "~/types";
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

    const handleClick = (menuItem: MenuItem) => () => {
      if (!menuItem.name) {
        return;
      }

      if (commands[menuItem.name]) {
        commands[menuItem.name](
          typeof menuItem.attrs === "function"
            ? menuItem.attrs(state)
            : menuItem.attrs
        );
      } else if (menuItem.onClick) {
        menuItem.onClick();
      }
    };

    const resolveChildren = (
      children: MenuItem[] | (() => MenuItem[]) | undefined
    ): MenuItem[] | undefined =>
      typeof children === "function" ? children() : children;

    const mapChildren = (children: MenuItem[]): TMenuItem[] =>
      children.map((child) => {
        if (child.name === "separator") {
          return { type: "separator", visible: child.visible };
        }
        if ("content" in child) {
          return {
            type: "custom",
            visible: child.visible,
            content: child.content,
          };
        }
        const resolvedChildren = resolveChildren(child.children);
        if (resolvedChildren) {
          const childWithPreventClose = resolvedChildren.find(
            (c) => "preventCloseCondition" in c
          );
          return {
            type: "submenu",
            title: child.label,
            icon: child.icon,
            visible: child.visible,
            preventCloseCondition: childWithPreventClose?.preventCloseCondition,
            items: mapChildren(resolvedChildren),
          };
        }
        return {
          type: "button",
          title: child.label,
          icon: child.icon,
          dangerous: child.dangerous,
          visible: child.visible,
          selected:
            child.active !== undefined ? child.active(state) : undefined,
          onClick: handleClick(child),
        };
      });

    const resolvedItemChildren = resolveChildren(item.children);
    return resolvedItemChildren ? mapChildren(resolvedItemChildren) : [];
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
    commands[item.name](
      typeof item.attrs === "function" ? item.attrs(state) : item.attrs
    );
  };

  return (
    <TooltipProvider>
      <Toolbar.Root asChild>
        <FlexibleWrapper>
          {items.map((item, index) => {
            if (item.name === "separator" && item.visible !== false) {
              return <ToolbarSeparator key={index} />;
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
    gap: 10px;

    ${hideScrollbars()}
  `}
`;

const Label = styled.span`
  font-size: 15px;
  font-weight: 500;
  color: ${s("text")};
`;

export default ToolbarMenu;
