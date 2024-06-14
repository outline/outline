import RawData from "@emoji-mart/data";
import type { EmojiMartData, Skin } from "@emoji-mart/data";
import { init, Data } from "emoji-mart";
import FuzzySearch from "fuzzy-search";
import capitalize from "lodash/capitalize";
import sortBy from "lodash/sortBy";
import { Emoji, EmojiCategory, EmojiSkin, EmojiVariants } from "../types";

init({ data: RawData });

// Data has the pre-processed "search" terms.
const TypedData = Data as EmojiMartData;

const searcher = new FuzzySearch(Object.values(TypedData.emojis), ["search"], {
  caseSensitive: false,
  sort: true,
});

// Codes defined by unicode.org
const SKIN_CODE_TO_ENUM = {
  "1f3fb": EmojiSkin.Light,
  "1f3fc": EmojiSkin.MediumLight,
  "1f3fd": EmojiSkin.Medium,
  "1f3fe": EmojiSkin.MediumDark,
  "1f3ff": EmojiSkin.Dark,
};

type GetVariantsProps = {
  id: string;
  name: string;
  skins: Skin[];
};

const getVariants = ({ id, name, skins }: GetVariantsProps): EmojiVariants =>
  skins.reduce((obj, skin) => {
    const skinCode = skin.unified.split("-")[1];
    const skinType = SKIN_CODE_TO_ENUM[skinCode] ?? EmojiSkin.Default;
    obj[skinType] = { id, name, value: skin.native } satisfies Emoji;
    return obj;
  }, {} as EmojiVariants);

const EMOJI_ID_TO_VARIANTS = Object.entries(TypedData.emojis).reduce(
  (obj, [id, emoji]) => {
    obj[id] = getVariants({
      id,
      name: emoji.name,
      skins: emoji.skins,
    });
    return obj;
  },
  {} as Record<string, EmojiVariants>
);

const CATEGORY_TO_EMOJI_IDS: Record<EmojiCategory, string[]> =
  TypedData.categories.reduce((obj, { id, emojis }) => {
    const category = EmojiCategory[capitalize(id)];
    if (!category) {
      return obj;
    }
    obj[category] = emojis;
    return obj;
  }, {} as Record<EmojiCategory, string[]>);

export const getEmojis = ({
  ids,
  skin,
}: {
  ids: string[];
  skin: EmojiSkin;
}): Emoji[] =>
  ids.map(
    (id) =>
      EMOJI_ID_TO_VARIANTS[id][skin] ??
      EMOJI_ID_TO_VARIANTS[id][EmojiSkin.Default]
  );

export const getEmojisWithCategory = ({
  skin,
}: {
  skin: EmojiSkin;
}): Record<EmojiCategory, Emoji[]> =>
  Object.keys(CATEGORY_TO_EMOJI_IDS).reduce((obj, category: EmojiCategory) => {
    const emojiIds = CATEGORY_TO_EMOJI_IDS[category];
    const emojis = emojiIds.map(
      (emojiId) =>
        EMOJI_ID_TO_VARIANTS[emojiId][skin] ??
        EMOJI_ID_TO_VARIANTS[emojiId][EmojiSkin.Default]
    );
    obj[category] = emojis;
    return obj;
  }, {} as Record<EmojiCategory, Emoji[]>);

export const getEmojiVariants = ({ id }: { id: string }) =>
  EMOJI_ID_TO_VARIANTS[id];

export const search = ({
  query,
  skin,
}: {
  query: string;
  skin?: EmojiSkin;
}) => {
  const queryLowercase = query.toLowerCase();
  const emojiSkin = skin ?? EmojiSkin.Default;

  const matchedEmojis = searcher
    .search(queryLowercase)
    .map(
      (emoji) =>
        EMOJI_ID_TO_VARIANTS[emoji.id][emojiSkin] ??
        EMOJI_ID_TO_VARIANTS[emoji.id][EmojiSkin.Default]
    );
  return sortBy(matchedEmojis, (emoji) => {
    const nlc = emoji.name.toLowerCase();
    return query === nlc ? -1 : nlc.startsWith(queryLowercase) ? 0 : 1;
  });
};
