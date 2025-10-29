import capitalize from "lodash/capitalize";
import { useCallback, useEffect, useState } from "react";
import { emojiMartToGemoji, snakeCase } from "@shared/editor/lib/emoji";
import { search as emojiSearch } from "@shared/utils/emoji";
import type { Emoji as ShortEmojiType } from "@shared/types";
import EmojiMenuItem from "./EmojiMenuItem";
import SuggestionsMenu, {
  Props as SuggestionsMenuProps,
} from "./SuggestionsMenu";
import { isInternalUrl } from "@shared/utils/urls";

type Emoji = {
  name: string;
  title: string;
  emoji: string;
  description: string;
  attrs: { markup: string; "data-name": string };
};

type Props = Omit<
  SuggestionsMenuProps<Emoji>,
  "renderMenuItem" | "items" | "embeds"
>;

const EmojiMenu = (props: Props) => {
  const { search = "" } = props;
  const [items, setItems] = useState<Emoji[]>([]);

  useEffect(() => {
    const setEmojiItems = (results: ShortEmojiType[]) => {
      const mappedItems = results
        .map((item) => {
          // We snake_case the shortcode for backwards compatability with gemoji to
          // avoid multiple formats being written into documents.
          // @ts-expect-error emojiMartToGemoji key
          const shortcode = snakeCase(emojiMartToGemoji[item.id] || item.id);
          const emoji = item.value;

          return {
            name: "emoji",
            title: emoji,
            description: capitalize(item.name.toLowerCase()),
            emoji,
            attrs: {
              markup: shortcode,
              "data-name": isInternalUrl(emoji) ? emoji : shortcode,
              type: isInternalUrl(emoji) ? "custom" : "emoji",
            },
          };
        })
        .slice(0, 15);

      setItems(mappedItems);
    };

    const results = emojiSearch({ query: search, onUpdate: setEmojiItems });
    setEmojiItems(results);
  }, [search]);

  const renderMenuItem = useCallback(
    (item, _index, options) => (
      <EmojiMenuItem
        onClick={options.onClick}
        selected={options.selected}
        title={item.description}
        emoji={item.emoji}
      />
    ),
    []
  );

  return (
    <SuggestionsMenu
      {...props}
      filterable={false}
      renderMenuItem={renderMenuItem}
      items={items}
    />
  );
};

export default EmojiMenu;
