import capitalize from "lodash/capitalize";
import { useCallback, useMemo, useEffect } from "react";
import { emojiMartToGemoji, snakeCase } from "@shared/editor/lib/emoji";
import { search as emojiSearch } from "@shared/utils/emoji";
import EmojiMenuItem from "./EmojiMenuItem";
import type { Props as SuggestionsMenuProps } from "./SuggestionsMenu";
import SuggestionsMenu from "./SuggestionsMenu";
import useStores from "~/hooks/useStores";
import { determineIconType } from "@shared/utils/icon";
import { IconType } from "@shared/types";

type Emoji = {
  name: string;
  title: string;
  emoji: string;
  description: string;
  attrs: { "data-name": string };
};

type Props = Omit<
  SuggestionsMenuProps<Emoji>,
  "renderMenuItem" | "items" | "embeds"
>;

const EmojiMenu = (props: Props) => {
  const { emojis } = useStores();
  const { search = "" } = props;

  useEffect(() => {
    if (search) {
      void emojis.fetchPage({ query: search });
    }
  }, [emojis, search]);

  const items = useMemo(
    () =>
      emojiSearch({ customEmojis: emojis.orderedData, query: search })
        .map((item) => {
          // We snake_case the shortcode for backwards compatability with gemoji to
          // avoid multiple formats being written into documents.
          // @ts-expect-error emojiMartToGemoji key
          const id = emojiMartToGemoji[item.id] || item.id;
          const type = determineIconType(id);
          const value = type === IconType.Custom ? id : snakeCase(id);
          const emoji = item.value;

          return {
            name: "emoji",
            title: emoji,
            description:
              type === IconType.Custom
                ? item.name
                : capitalize(item.name.toLowerCase()),
            emoji,
            attrs: { "data-name": value },
          };
        })
        .slice(0, 15),
    [search, emojis.orderedData]
  );

  const renderMenuItem = useCallback(
    (item, _index, options) => (
      <EmojiMenuItem {...options} title={item.description} emoji={item.emoji} />
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
