import * as React from "react";
import styled from "styled-components";
import { MenuItem } from "@shared/editor/types";
import { s } from "@shared/styles";
import { useEditor } from "./EditorContext";
import ToolbarButton from "./ToolbarButton";
import ToolbarSeparator from "./ToolbarSeparator";
import Tooltip from "./Tooltip";

type Props = {
  items: MenuItem[];
};

const FlexibleWrapper = styled.div`
  color: ${s("toolbarItem")};
  display: flex;
  gap: 8px;
`;

function ToolbarMenu(props: Props) {
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
            <ToolbarButton onClick={handleClick(item)} active={isActive}>
              {item.label && <Label>{item.label}</Label>}
              {item.icon}
            </ToolbarButton>
          </Tooltip>
        );
      })}
    </FlexibleWrapper>
  );
}

const Label = styled.span`
  font-size: 15px;
  font-weight: 500;
`;

export default ToolbarMenu;
