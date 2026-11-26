import { compact, zip } from "es-toolkit";
import { capitalize } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { useCallback, useMemo, useEffect } from "react";
import { emojiMartToGemoji, snakeCase } from "@shared/editor/lib/emoji";
import { getEmojis, search as emojiSearch } from "@shared/utils/emoji";
import EmojiMenuItem from "./EmojiMenuItem";
import type { Props as SuggestionsMenuProps } from "./SuggestionsMenu";
import SuggestionsMenu from "./SuggestionsMenu";
import useStores from "~/hooks/useStores";
import { determineIconType } from "@shared/utils/icon";
import { EmojiSkinTone, IconType } from "@shared/types";
import type { Emoji as EmojiData } from "@shared/types";
import type EmojiModel from "~/models/Emoji";
import type { MenuItem } from "@shared/editor/types";
import { iconFrequencies } from "~/components/IconPicker/utils";

type Emoji = {
  id: string;
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

  // Read on open so the list reflects emojis chosen since the menu last showed.
  const recent = useMemo<RecentEmojiIds | undefined>(
    () =>
      props.isActive
        ? {
            emojis: iconFrequencies[IconType.Emoji].frequent,
            custom: iconFrequencies[IconType.Custom].frequent,
          }
        : undefined,
    [props.isActive]
  );

  useEffect(() => {
    if (search) {
      void emojis.fetchPage({ query: search });
      return;
    }

    recent?.custom.forEach((id) => {
      void emojis.fetch(id).catch(() => undefined);
    });
  }, [emojis, search, recent]);

  const items = useMemo(() => {
    const recentEmojis =
      search || !recent ? [] : getRecentEmojis(recent, emojis.orderedData);
    const results = recentEmojis.length
      ? recentEmojis
      : emojiSearch({ customEmojis: emojis.orderedData, query: search });

    return results.slice(0, 15).map(toMenuItem);
  }, [search, recent, emojis.orderedData]);

  const handleSelect = useCallback(
    (item: MenuItem) => {
      const emoji = items.find((i) => i === item);
      if (!emoji) {
        return;
      }
      const type = determineIconType(emoji.id);
      iconFrequencies[
        type === IconType.Custom ? IconType.Custom : IconType.Emoji
      ].track(emoji.id);
    },
    [items]
  );

  const renderMenuItem = useCallback<
    SuggestionsMenuProps<Emoji>["renderMenuItem"]
  >(
    (item, _index, options) => (
      <EmojiMenuItem {...options} title={item.description} emoji={item.emoji} />
    ),
    []
  );

  return (
    <SuggestionsMenu
      {...props}
      filterable={false}
      onSelect={handleSelect}
      renderMenuItem={renderMenuItem}
      items={items}
    />
  );
};

interface RecentEmojiIds {
  emojis: string[];
  custom: string[];
}

/**
 * Resolve recent emoji ids, interleaving standard and custom emojis so both
 * appear within the result limit, and skipping custom emojis that are not loaded.
 */
const getRecentEmojis = (
  recent: RecentEmojiIds,
  customEmojis: EmojiModel[]
): EmojiData[] => {
  // Emoji nodes store only the shortcode, so skin tones would not be inserted.
  const standard = getEmojis({
    ids: recent.emojis,
    skinTone: EmojiSkinTone.Default,
  });
  const custom = recent.custom.flatMap((id) => {
    const emoji = customEmojis.find((e) => e.id === id);
    return emoji ? [{ id: emoji.id, name: emoji.name, value: emoji.id }] : [];
  });

  return compact(zip(standard, custom).flat());
};

const toMenuItem = (item: EmojiData): Emoji => {
  // We snake_case the shortcode for backwards compatibility with gemoji to
  // avoid multiple formats being written into documents.
  const id = emojiMartToGemoji[item.id] || item.id;
  const type = determineIconType(id);
  const value = type === IconType.Custom ? id : snakeCase(id);

  return {
    id: item.id,
    name: "emoji",
    title: item.value,
    description:
      type === IconType.Custom
        ? item.name
        : capitalize(item.name.toLowerCase()),
    emoji: item.value,
    attrs: { "data-name": value },
  };
};

export default observer(EmojiMenu);
