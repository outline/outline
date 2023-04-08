import { findParentNode } from "prosemirror-utils";
import React from "react";
import useDictionary from "~/hooks/useDictionary";
import getMenuItems from "../menus/block";
import { useEditor } from "./EditorContext";
import SuggestionsMenu, {
  Props as SuggestionsMenuProps,
} from "./SuggestionsMenu";
import SuggestionsMenuItem from "./SuggestionsMenuItem";

type Props = Omit<
  SuggestionsMenuProps,
  "renderMenuItem" | "items" | "onClearSearch"
> &
  Required<Pick<SuggestionsMenuProps, "onLinkToolbarOpen" | "embeds">>;

function BlockMenu(props: Props) {
  const { view } = useEditor();
  const dictionary = useDictionary();

  const clearSearch = React.useCallback(() => {
    const { state, dispatch } = view;
    const parent = findParentNode((node) => !!node)(state.selection);

    if (parent) {
      dispatch(state.tr.insertText("", parent.pos, state.selection.to));
    }
  }, [view]);

  return (
    <SuggestionsMenu
      {...props}
      filterable
      onClearSearch={clearSearch}
      renderMenuItem={(item, _index, options) => (
        <SuggestionsMenuItem
          onClick={options.onClick}
          selected={options.selected}
          icon={item.icon}
          title={item.title}
          shortcut={item.shortcut}
        />
      )}
      items={getMenuItems(dictionary)}
    />
  );
}

export default BlockMenu;
