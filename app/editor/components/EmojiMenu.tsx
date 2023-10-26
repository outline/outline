import data, { type Emoji as TEmoji } from "@emoji-mart/data";
import { init, Data } from "emoji-mart";
import FuzzySearch from "fuzzy-search";
import capitalize from "lodash/capitalize";
import sortBy from "lodash/sortBy";
import React from "react";
import { emojiMartToGemoji, snakeCase } from "@shared/editor/lib/emoji";
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

void init({ data });
let searcher: FuzzySearch<TEmoji>;

type Props = Omit<
  SuggestionsMenuProps<Emoji>,
  "renderMenuItem" | "items" | "onLinkToolbarOpen" | "embeds" | "trigger"
>;

const EmojiMenu = (props: Props) => {
  const { search = "" } = props;

  if (!searcher) {
    searcher = new FuzzySearch(Object.values(Data.emojis), ["search"], {
      caseSensitive: false,
      sort: true,
    });
  }

  const items = React.useMemo(() => {
    const n = search.toLowerCase();

    return sortBy(searcher.search(n), (item) => {
      const nlc = item.name.toLowerCase();
      return nlc === n ? -1 : nlc.startsWith(n) ? 0 : 1;
    })
      .map((item) => {
        // We snake_case the shortcode for backwards compatability with gemoji to
        // avoid multiple formats being written into documents.
        const shortcode = snakeCase(emojiMartToGemoji[item.id] || item.id);
        const emoji = item.skins[0].native;

        return {
          name: "emoji",
          title: emoji,
          description: capitalize(item.name.toLowerCase()),
          emoji,
          attrs: { markup: shortcode, "data-name": shortcode },
        };
      })
      .slice(0, 15);
  }, [search]);

  return (
    <SuggestionsMenu
      {...props}
      trigger=":"
      filterable={false}
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
