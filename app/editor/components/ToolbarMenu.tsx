import { EditorView } from "prosemirror-view";
import * as React from "react";
import styled, { useTheme } from "styled-components";
import { CommandFactory } from "@shared/editor/lib/Extension";
import { MenuItem } from "@shared/editor/types";
import ToolbarButton from "./ToolbarButton";
import ToolbarSeparator from "./ToolbarSeparator";
import Tooltip from "./Tooltip";

type Props = {
  commands: Record<string, CommandFactory>;
  view: EditorView;
  items: MenuItem[];
};

const FlexibleWrapper = styled.div`
  display: flex;
  gap: 8px;
`;

function ToolbarMenu(props: Props) {
  const theme = useTheme();
  const { view, items } = props;
  const { state } = view;

  return (
    <FlexibleWrapper>
      {items.map((item, index) => {
        if (item.name === "separator" && item.visible !== false) {
          return <ToolbarSeparator key={index} />;
        }
        if (item.visible === false || !item.icon) {
          return null;
        }
        const Icon = item.icon;
        const isActive = item.active ? item.active(state) : false;

        return (
          <Tooltip tooltip={item.tooltip}>
            <ToolbarButton
              key={index}
              onClick={() => item.name && props.commands[item.name](item.attrs)}
              active={isActive}
            >
              <Icon color={theme.toolbarItem} />
            </ToolbarButton>
          </Tooltip>
        );
      })}
    </FlexibleWrapper>
  );
}

export default ToolbarMenu;
