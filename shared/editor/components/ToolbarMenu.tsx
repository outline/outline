import { EditorView } from "prosemirror-view";
import * as React from "react";
import styled, { useTheme } from "styled-components";
import { CommandFactory } from "../lib/Extension";
import { MenuItem } from "../types";
import ToolbarButton from "./ToolbarButton";
import ToolbarSeparator from "./ToolbarSeparator";

type Props = {
  tooltip: typeof React.Component | React.FC;
  commands: Record<string, CommandFactory>;
  view: EditorView;
  items: MenuItem[];
};

const FlexibleWrapper = styled.div`
  display: flex;
`;

function ToolbarMenu(props: Props) {
  const theme = useTheme();
  const { view, items } = props;
  const { state } = view;
  const Tooltip = props.tooltip;

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
          <ToolbarButton
            key={index}
            onClick={() => item.name && props.commands[item.name](item.attrs)}
            active={isActive}
          >
            <Tooltip tooltip={item.tooltip} placement="top">
              <Icon color={theme.toolbarItem} />
            </Tooltip>
          </ToolbarButton>
        );
      })}
    </FlexibleWrapper>
  );
}

export default ToolbarMenu;
