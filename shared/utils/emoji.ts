import RawData from "@emoji-mart/data";
import type { EmojiMartData, Skin } from "@emoji-mart/data";
import { init, Data } from "emoji-mart";
import FuzzySearch from "fuzzy-search";
import capitalize from "lodash/capitalize";
import sortBy from "lodash/sortBy";
import { Emoji, EmojiCategory, EmojiSkinTone, EmojiVariants } from "../types";

init({ data: RawData });

// Data has the pre-processed "search" terms.
const TypedData = Data as EmojiMartData;

// Slightly modified version of https://github.com/koala-interactive/is-emoji-supported/blob/master/src/is-emoji-supported.ts
const isFlagEmojiSupported = (): boolean => {
  const emoji = "🇺🇸";
  let ctx = null;
  try {
    ctx = document
      .createElement("canvas")
      .getContext("2d", { willReadFrequently: true });

    if (!ctx) {
      return false;
    }

    const CANVAS_HEIGHT = 25;
    const CANVAS_WIDTH = 20;
    const textSize = Math.floor(CANVAS_HEIGHT / 2);

    // Initialize convas context
    ctx.font = textSize + "px Arial, Sans-Serif";
    ctx.textBaseline = "top";
    ctx.canvas.width = CANVAS_WIDTH * 2;
    ctx.canvas.height = CANVAS_HEIGHT;

    // Draw in red on the left
    ctx.fillStyle = "#FF0000";
    ctx.fillText(emoji, 0, 22);

    // Draw in blue on right
    ctx.fillStyle = "#0000FF";
    ctx.fillText(emoji, CANVAS_WIDTH, 22);

    const a = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;
    const count = a.length;
    let i = 0;

    // Search the first visible pixel
    // eslint-disable-next-line curly
    for (; i < count && !a[i + 3]; i += 4);

    // No visible pixel
    if (i >= count) {
      return false;
    }

    // Emoji has immutable color, so we check the color of the emoji in two different colors
    // the result show be the same.
    const x = CANVAS_WIDTH + ((i / 4) % CANVAS_WIDTH);
    const y = Math.floor(i / 4 / CANVAS_WIDTH);
    const b = ctx.getImageData(x, y, 1, 1).data;

    if (a[i] !== b[0] || a[i + 2] !== b[2]) {
      return false;
    }

    // Some emojis are a contraction of different ones, so if it's not
    // supported, it will show multiple characters
    if (ctx.measureText(emoji).width >= CANVAS_WIDTH) {
      return false;
    }
  } catch {
    return false;
  }

  // Supported
  return true;
};

const allowFlagEmoji = isFlagEmojiSupported();

const flagEmojiIds =
  TypedData.categories
    .filter(({ id }) => id === EmojiCategory.Flags.toLowerCase())
    .map(({ emojis }) => emojis)[0] ?? [];

const Categories = allowFlagEmoji
  ? TypedData.categories
  : TypedData.categories.filter(
      ({ id }) => capitalize(id) !== EmojiCategory.Flags
    );

const Emojis = allowFlagEmoji
  ? TypedData.emojis
  : Object.fromEntries(
      Object.entries(TypedData.emojis).filter(
        ([id]) => !flagEmojiIds.includes(id)
      )
    );

const searcher = new FuzzySearch(Object.values(Emojis), ["search"], {
  caseSensitive: false,
  sort: true,
});

// Codes defined by unicode.org
const SKINTONE_CODE_TO_ENUM = {
  "1f3fb": EmojiSkinTone.Light,
  "1f3fc": EmojiSkinTone.MediumLight,
  "1f3fd": EmojiSkinTone.Medium,
  "1f3fe": EmojiSkinTone.MediumDark,
  "1f3ff": EmojiSkinTone.Dark,
};

type GetVariantsProps = {
  id: string;
  name: string;
  skins: Skin[];
};

const getVariants = ({ id, name, skins }: GetVariantsProps): EmojiVariants =>
  skins.reduce((obj, skin) => {
    const skinToneCode = skin.unified.split(
      "-"
    )[1] as keyof typeof SKINTONE_CODE_TO_ENUM;
    const skinToneType =
      SKINTONE_CODE_TO_ENUM[skinToneCode] ?? EmojiSkinTone.Default;
    obj[skinToneType] = { id, name, value: skin.native } satisfies Emoji;
    return obj;
  }, {} as EmojiVariants);

const EMOJI_ID_TO_VARIANTS = Object.entries(Emojis).reduce(
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
  Categories.reduce((obj, { id, emojis }) => {
    const key = capitalize(id) as EmojiCategory;
    const category = EmojiCategory[key];
    if (!category) {
      return obj;
    }
    obj[category] = emojis;
    return obj;
  }, {} as Record<EmojiCategory, string[]>);

export const getEmojis = ({
  ids,
  skinTone,
}: {
  ids: string[];
  skinTone: EmojiSkinTone;
}): Emoji[] =>
  ids.map(
    (id) =>
      EMOJI_ID_TO_VARIANTS[id][skinTone] ??
      EMOJI_ID_TO_VARIANTS[id][EmojiSkinTone.Default]
  );

export const getEmojisWithCategory = ({
  skinTone,
}: {
  skinTone: EmojiSkinTone;
}): Record<EmojiCategory, Emoji[]> =>
  Object.keys(CATEGORY_TO_EMOJI_IDS).reduce((obj, category: EmojiCategory) => {
    const emojiIds = CATEGORY_TO_EMOJI_IDS[category];
    const emojis = emojiIds.map(
      (emojiId) =>
        EMOJI_ID_TO_VARIANTS[emojiId][skinTone] ??
        EMOJI_ID_TO_VARIANTS[emojiId][EmojiSkinTone.Default]
    );
    obj[category] = emojis;
    return obj;
  }, {} as Record<EmojiCategory, Emoji[]>);

export const getEmojiVariants = ({ id }: { id: string }) =>
  EMOJI_ID_TO_VARIANTS[id];

export const search = ({
  query,
  skinTone,
}: {
  query: string;
  skinTone?: EmojiSkinTone;
}) => {
  const queryLowercase = query.toLowerCase();
  const emojiSkinTone = skinTone ?? EmojiSkinTone.Default;

  const matchedEmojis = searcher
    .search(queryLowercase)
    .map(
      (emoji) =>
        EMOJI_ID_TO_VARIANTS[emoji.id][emojiSkinTone] ??
        EMOJI_ID_TO_VARIANTS[emoji.id][EmojiSkinTone.Default]
    );
  return sortBy(matchedEmojis, (emoji) => {
    const nlc = emoji.name.toLowerCase();
    return query === nlc ? -1 : nlc.startsWith(queryLowercase) ? 0 : 1;
  });
};

/**
 * Get am emoji's human-readable ID from its string.
 *
 * @param emoji - The string representation of the emoji.
 * @returns The emoji id, if found.
 */
export const getEmojiId = (emoji: string): string | undefined =>
  searcher.search(emoji)[0]?.id;
