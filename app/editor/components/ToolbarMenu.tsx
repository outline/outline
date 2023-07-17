import { ExpandedIcon } from "outline-icons";
import * as React from "react";
import { useMenuState } from "reakit";
import { MenuButton } from "reakit/Menu";
import styled from "styled-components";
import { MenuItem } from "@shared/editor/types";
import { s } from "@shared/styles";
import ContextMenu from "~/components/ContextMenu";
import Template from "~/components/ContextMenu/Template";
import { useEditor } from "./EditorContext";
import ToolbarButton from "./ToolbarButton";
import ToolbarSeparator from "./ToolbarSeparator";
import Tooltip from "./Tooltip";

type Props = {
  items: MenuItem[];
};

const FlexibleWrapper = styled.div`
  color: ${s("textSecondary")};
  display: flex;
  gap: 8px;
`;

function ToolbarMenu(props: Props) {
  const menu = useMenuState();
  const { commands, view } = useEditor();
  const { items } = props;
  const { state } = view;

  const handleClick = (item: MenuItem) => () => {
    if (!item.name) {
      return;
    }

    const attrs =
      typeof item.attrs === "function" ? item.attrs(state) : item.attrs;

    commands[item.name](attrs);
  };

  return (
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
            tooltip={item.label === item.tooltip ? undefined : item.tooltip}
            key={index}
          >
            {item.children ? (
              <>
                <MenuButton {...menu}>
                  {(props) => (
                    <ToolbarButton {...props} active={isActive}>
                      {item.label && <Label>{item.label}</Label>}
                      <Arrow />
                    </ToolbarButton>
                  )}
                </MenuButton>
                <ContextMenu {...menu}>
                  <Template
                    {...menu}
                    items={item.children.map((child) => ({
                      type: "button",
                      title: child.label,
                      icon: child.icon,
                      selected: child.active ? child.active(state) : false,
                      onClick: handleClick(child),
                    }))}
                  />
                </ContextMenu>
              </>
            ) : (
              <ToolbarButton onClick={handleClick(item)} active={isActive}>
                {item.label && <Label>{item.label}</Label>}
                {item.icon}
              </ToolbarButton>
            )}
          </Tooltip>
        );
      })}
    </FlexibleWrapper>
  );
}

const Arrow = styled(ExpandedIcon)`
  margin-right: -4px;
`;

const Label = styled.span`
  font-size: 15px;
  font-weight: 500;
`;

export default ToolbarMenu;
