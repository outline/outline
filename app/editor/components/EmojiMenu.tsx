import capitalize from "lodash/capitalize";
import React from "react";
import { emojiMartToGemoji, snakeCase } from "@shared/editor/lib/emoji";
import { search as emojiSearch } from "@shared/utils/emoji";
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

type Props = Omit<
  SuggestionsMenuProps<Emoji>,
  "renderMenuItem" | "items" | "embeds" | "trigger"
>;

const EmojiMenu = (props: Props) => {
  const { search = "" } = props;

  const items = React.useMemo(
    () =>
      emojiSearch({ query: search })
        .map((item) => {
          // We snake_case the shortcode for backwards compatability with gemoji to
          // avoid multiple formats being written into documents.
          const shortcode = snakeCase(emojiMartToGemoji[item.id] || item.id);
          const emoji = item.value;

          return {
            name: "emoji",
            title: emoji,
            description: capitalize(item.name.toLowerCase()),
            emoji,
            attrs: { markup: shortcode, "data-name": shortcode },
          };
        })
        .slice(0, 15),
    [search]
  );

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
