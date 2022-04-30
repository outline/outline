import FuzzySearch from "fuzzy-search";
import gemojies from "gemoji";
import React from "react";
import CommandMenu, { Props } from "./CommandMenu";
import EmojiMenuItem from "./EmojiMenuItem";

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

class EmojiMenu extends React.PureComponent<
  Omit<
    Props<Emoji>,
    | "renderMenuItem"
    | "items"
    | "onLinkToolbarOpen"
    | "embeds"
    | "onClearSearch"
  >
> {
  get items(): Emoji[] {
    const { search = "" } = this.props;

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
  }

  clearSearch = () => {
    const { state, dispatch } = this.props.view;

    // clear search input
    dispatch(
      state.tr.insertText(
        "",
        state.selection.$from.pos - (this.props.search ?? "").length - 1,
        state.selection.to
      )
    );
  };

  render() {
    const containerId = "emoji-menu-container";
    return (
      <CommandMenu
        {...this.props}
        id={containerId}
        filterable={false}
        onClearSearch={this.clearSearch}
        renderMenuItem={(item, _index, options) => (
          <EmojiMenuItem
            onClick={options.onClick}
            selected={options.selected}
            title={item.description}
            emoji={item.emoji}
            containerId={containerId}
          />
        )}
        items={this.items}
      />
    );
  }
}

export default EmojiMenu;
