import { EditorView } from "prosemirror-view";
import * as React from "react";
import styled, { withTheme } from "styled-components";
import { MenuItem } from "../types";
import ToolbarButton from "./ToolbarButton";
import ToolbarSeparator from "./ToolbarSeparator";

type Props = {
  tooltip: typeof React.Component | React.FC<any>;
  commands: Record<string, any>;
  view: EditorView;
  items: MenuItem[];
};

const FlexibleWrapper = styled.div`
  display: flex;
`;

class ToolbarMenu extends React.Component<Props> {
  render() {
    const { view, items } = this.props;
    const { state } = view;
    const Tooltip = this.props.tooltip;

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
              onClick={() =>
                item.name && this.props.commands[item.name](item.attrs)
              }
              active={isActive}
            >
              <Tooltip tooltip={item.tooltip} placement="top">
                <Icon color={this.props.theme.toolbarItem} />
              </Tooltip>
            </ToolbarButton>
          );
        })}
      </FlexibleWrapper>
    );
  }
}

export default withTheme(ToolbarMenu);
