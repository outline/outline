import FuzzySearch from "fuzzy-search";
import gemojies from "gemoji";
import React from "react";
import { useEditor } from "./EditorContext";
import EmojiMenuItem from "./EmojiMenuItem";
import SuggestionsMenu, {
  Props as SuggestionsMenuProps,
} from "./SuggestionsMenu";

type Emoji = {
  name: string;
  title: string;
  emoji: string;
  description: string;
  attrs: { markup: string; "data-name": string };
};

const searcher = new FuzzySearch<{
  names: string[];
  description: string;
  emoji: string;
}>(gemojies, ["names"], {
  caseSensitive: true,
  sort: true,
});

type Props = Omit<
  SuggestionsMenuProps<Emoji>,
  "renderMenuItem" | "items" | "onLinkToolbarOpen" | "embeds" | "onClearSearch"
>;

const EmojiMenu = (props: Props) => {
  const { search = "" } = props;
  const { view } = useEditor();

  const items = React.useMemo(() => {
    const n = search.toLowerCase();
    const result = searcher.search(n).map((item) => {
      const description = item.description;
      const name = item.names[0];
      return {
        ...item,
        name: "emoji",
        title: name,
        description,
        attrs: { markup: name, "data-name": name },
      };
    });

    return result.slice(0, 10);
  }, [search]);

  const clearSearch = React.useCallback(() => {
    const { state, dispatch } = view;

    // clear search input
    dispatch(
      state.tr.insertText(
        "",
        state.selection.$from.pos - (props.search ?? "").length - 1,
        state.selection.to
      )
    );
  }, [view, props.search]);

  return (
    <SuggestionsMenu
      {...props}
      filterable={false}
      onClearSearch={clearSearch}
      renderMenuItem={(item, _index, options) => (
        <EmojiMenuItem
          onClick={options.onClick}
          selected={options.selected}
          title={item.description}
          emoji={item.emoji}
        />
      )}
      items={items}
    />
  );
};

export default EmojiMenu;
