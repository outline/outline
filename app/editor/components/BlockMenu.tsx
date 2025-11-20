import { useCallback } from "react";
import useDictionary from "~/hooks/useDictionary";
import getMenuItems from "../menus/block";
import { useEditor } from "./EditorContext";
import SuggestionsMenu, {
  Props as SuggestionsMenuProps,
} from "./SuggestionsMenu";
import SuggestionsMenuItem from "./SuggestionsMenuItem";

type Props = Omit<SuggestionsMenuProps, "renderMenuItem" | "items"> &
  Required<Pick<SuggestionsMenuProps, "embeds">>;

function BlockMenu(props: Props) {
  const dictionary = useDictionary();
  const { elementRef } = useEditor();

  const renderMenuItem = useCallback(
    (item, _index, options) => (
      <SuggestionsMenuItem
        {...options}
        icon={item.icon}
        title={item.title}
        shortcut={item.shortcut}
      />
    ),
    []
  );

  return (
    <SuggestionsMenu
      {...props}
      filterable
      trigger="/"
      renderMenuItem={renderMenuItem}
      items={getMenuItems(dictionary, elementRef)}
    />
  );
}

export default BlockMenu;
