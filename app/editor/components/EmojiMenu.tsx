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
import useStores from "~/hooks/useStores";

type Emoji = {
  name: string;
  title: string;
  emoji: string;
  description: string;
  attrs: { markup: string; "data-name": string; "data-url"?: string };
};

type Props = Omit<
  SuggestionsMenuProps<Emoji>,
  "renderMenuItem" | "items" | "embeds"
>;

const EmojiMenu = (props: Props) => {
  const { search = "" } = props;
  const [items, setItems] = useState<Emoji[]>([]);
  const { emojis } = useStores();

  useEffect(() => {
    const updateItems = (results: ShortEmojiType[]) => {
      setItems(results.map(toMenuItem).slice(0, 15));
    };

    // search through regular emojis
    const localResults = emojiSearch({ query: search });
    updateItems(localResults);

    // Fetch and merge custom emojis
    emojis.fetchPage({ query: search }).then((serverData) => {
      if (!serverData.length) {return;}

      const customEmojis = serverData.map((e) => ({
        id: e.id,
        name: e.name,
        search: e.name,
        value: e.url,
      }));

      const mergedResults = emojiSearch({
        query: search,
        emojis: customEmojis,
      });

      updateItems(mergedResults);
    });
  }, [search, emojis]);

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

const toMenuItem = (item: ShortEmojiType): Emoji => {
  // We snake_case the shortcode for backwards compatability with gemoji to
  // avoid multiple formats being written into documents.
  // @ts-expect-error emojiMartToGemoji key
  const shortcode = snakeCase(emojiMartToGemoji[item.id] || item.id);
  const emoji = item.value;
  const isCustom = isInternalUrl(emoji);

  return {
    name: "emoji",
    title: emoji,
    description: capitalize(item.name.toLowerCase()),
    emoji,
    attrs: {
      markup: shortcode,
      "data-name": isCustom ? item.name : shortcode,
      "data-url": isCustom ? emoji : undefined,
    },
  };
};

export default EmojiMenu;
