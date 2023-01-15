import { findParentNode } from "prosemirror-utils";
import React from "react";
import getMenuItems from "../menus/block";
import CommandMenu, { Props } from "./CommandMenu";
import CommandMenuItem from "./CommandMenuItem";

type BlockMenuProps = Omit<
  Props,
  "renderMenuItem" | "items" | "onClearSearch"
> &
  Required<Pick<Props, "onLinkToolbarOpen" | "embeds">>;

function BlockMenu(props: BlockMenuProps) {
  const clearSearch = () => {
    const { state, dispatch } = props.view;
    const parent = findParentNode((node) => !!node)(state.selection);

    if (parent) {
      dispatch(state.tr.insertText("", parent.pos, state.selection.to));
    }
  };

  return (
    <CommandMenu
      {...props}
      filterable={true}
      onClearSearch={clearSearch}
      renderMenuItem={(item, _index, options) => (
        <CommandMenuItem
          onClick={options.onClick}
          selected={options.selected}
          icon={item.icon}
          title={item.title}
          shortcut={item.shortcut}
        />
      )}
      items={getMenuItems(props.dictionary)}
    />
  );
}

export default BlockMenu;
