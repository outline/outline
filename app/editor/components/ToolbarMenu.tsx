import { TippyProps } from "@tippyjs/react";
import * as React from "react";
import { useMenuState } from "reakit";
import { MenuButton } from "reakit/Menu";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { MenuItem } from "@shared/editor/types";
import { s } from "@shared/styles";
import ContextMenu from "~/components/ContextMenu";
import Template from "~/components/ContextMenu/Template";
import { TooltipProvider } from "~/components/TooltipContext";
import { MenuItem as TMenuItem } from "~/types";
import { useEditor } from "./EditorContext";
import ToolbarButton from "./ToolbarButton";
import ToolbarSeparator from "./ToolbarSeparator";
import Tooltip from "./Tooltip";

type Props = {
  items: MenuItem[];
};

/*
 * Renders a dropdown menu in the floating toolbar.
 */
function ToolbarDropdown(props: { active: boolean; item: MenuItem }) {
  const menu = useMenuState();
  const { commands, view } = useEditor();
  const { item } = props;
  const { state } = view;

  const items: TMenuItem[] = React.useMemo(() => {
    const handleClick = (menuItem: MenuItem) => () => {
      if (!menuItem.name) {
        return;
      }

      commands[menuItem.name](
        typeof menuItem.attrs === "function"
          ? menuItem.attrs(state)
          : menuItem.attrs
      );
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

  return (
    <>
      <MenuButton {...menu}>
        {(buttonProps) => (
          <ToolbarButton {...buttonProps} hovering={menu.visible}>
            {item.label && <Label>{item.label}</Label>}
            {item.icon}
          </ToolbarButton>
        )}
      </MenuButton>
      <ContextMenu aria-label={item.label} {...menu}>
        <Template {...menu} items={items} />
      </ContextMenu>
    </>
  );
}

const tippyProps = { placement: "top" } as TippyProps;

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
    <TooltipProvider tippyProps={tippyProps}>
      <FlexibleWrapper>
        {items.map((item, index) => {
          if (item.name === "separator" && item.visible !== false) {
            return <ToolbarSeparator key={index} />;
          }
          if (item.visible === false || !item.icon) {
            return null;
          }
          const isActive = item.active ? item.active(state) : false;

          return (
            <Tooltip
              key={index}
              shortcut={item.shortcut}
              content={item.label === item.tooltip ? undefined : item.tooltip}
            >
              {item.children ? (
                <ToolbarDropdown active={isActive && !item.label} item={item} />
              ) : (
                <ToolbarButton
                  onClick={handleClick(item)}
                  active={isActive && !item.label}
                >
                  {item.label && <Label>{item.label}</Label>}
                  {item.icon}
                </ToolbarButton>
              )}
            </Tooltip>
          );
        })}
      </FlexibleWrapper>
    </TooltipProvider>
  );
}

const FlexibleWrapper = styled.div`
  color: ${s("textSecondary")};
  overflow: hidden;
  display: flex;
  gap: 6px;

  ${breakpoint("mobile", "tablet")`
    justify-content: space-evenly;
    align-items: baseline;
  `}
`;

const Label = styled.span`
  font-size: 15px;
  font-weight: 500;
  color: ${s("text")};
`;

export default ToolbarMenu;
