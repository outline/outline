import { useCallback, useMemo } from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import * as Toolbar from "@radix-ui/react-toolbar";
import { MenuItem } from "@shared/editor/types";
import { s } from "@shared/styles";
import { TooltipProvider } from "~/components/TooltipContext";
import { MenuItem as TMenuItem } from "~/types";
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
  handlers?: Record<string, (...args: any[]) => void>;
};

/*
 * Renders a dropdown menu in the floating toolbar.
 */
function ToolbarDropdown(props: {
  active: boolean;
  item: MenuItem;
  handlers?: Record<string, Function>;
}) {
  const { commands, view } = useEditor();
  const { t } = useTranslation();
  const { item, handlers } = props;
  const { state } = view;

  const items: TMenuItem[] = useMemo(() => {
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
      } else if (handlers && handlers[menuItem.name]) {
        handlers[menuItem.name](
          typeof menuItem.attrs === "function"
            ? menuItem.attrs(state)
            : menuItem.attrs
        );
      }
    };

    return item.children
      ? item.children.map((child) => {
          if (child.name === "separator") {
            return { type: "separator", visible: child.visible };
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
        })
      : [];
  }, [item.children, commands, state]);

  const handleCloseAutoFocus = useCallback((ev: Event) => {
    ev.stopImmediatePropagation();
  }, []);

  return (
    <EventBoundary>
      <MenuProvider variant="dropdown">
        <Menu>
          <MenuTrigger>
            <ToolbarButton aria-label={item.label ? undefined : item.tooltip}>
              {item.label && <Label>{item.label}</Label>}
              {item.icon}
            </ToolbarButton>
          </MenuTrigger>
          <MenuContent
            align="end"
            aria-label={item.tooltip || t("More options")}
            onCloseAutoFocus={handleCloseAutoFocus}
          >
            {toMenuItems(items)}
          </MenuContent>
        </Menu>
      </MenuProvider>
    </EventBoundary>
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

            return (
              <Tooltip
                key={index}
                shortcut={item.shortcut}
                content={item.label === item.tooltip ? undefined : item.tooltip}
              >
                {item.name === "dimensions" ? (
                  <MediaDimension key={index} />
                ) : item.children ? (
                  <ToolbarDropdown
                    handlers={props.handlers}
                    active={isActive && !item.label}
                    item={item}
                  />
                ) : (
                  <Toolbar.Button asChild>
                    <ToolbarButton
                      onClick={handleClick(item)}
                      active={isActive && !item.label}
                      aria-label={item.label ? undefined : item.tooltip}
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
  `}
`;

const Label = styled.span`
  font-size: 15px;
  font-weight: 500;
  color: ${s("text")};
`;

export default ToolbarMenu;
