import { findParentNode } from "prosemirror-utils";
import React from "react";
import getMenuItems from "../menus/block";
import CommandMenu, { Props as CommandMenuProps } from "./CommandMenu";
import CommandMenuItem from "./CommandMenuItem";

type Props = Omit<
  CommandMenuProps,
  "renderMenuItem" | "items" | "onClearSearch"
> &
  Required<Pick<CommandMenuProps, "onLinkToolbarOpen" | "embeds">>;

function BlockMenu(props: Props) {
  const clearSearch = React.useCallback(() => {
    const { state, dispatch } = props.view;
    const parent = findParentNode((node) => !!node)(state.selection);

    if (parent) {
      dispatch(state.tr.insertText("", parent.pos, state.selection.to));
    }
  }, [props.view]);

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
