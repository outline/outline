import RawData from "@emoji-mart/data";
import type { EmojiMartData, Emoji as RawEmoji, Skin } from "@emoji-mart/data";
import FuzzySearch from "fuzzy-search";
import { capitalize, sortBy } from "es-toolkit/compat";
import type { Emoji, EmojiVariants } from "../types";
import { EmojiCategory, EmojiSkinTone } from "../types";

/**
 * Build the string that an emoji is matched against when searching.
 *
 * @param emoji the emoji to build the string for.
 * @returns the lowercase search terms followed by the native skin variants, each preceded by a comma.
 */
export function getEmojiSearchString(emoji: RawEmoji): string {
  const terms = [
    emoji.id,
    ...emoji.name.split(/[-|_\s]+/),
    ...emoji.keywords,
    ...(emoji.emoticons ?? []),
  ]
    .map((term) => term.toLowerCase())
    .filter((term) => term.trim());
  const natives = emoji.skins.map(({ native }) => `,${native}`);

  return `,${terms.join(",")}${natives.join("")}`;
}

const TypedData = RawData as EmojiMartData;

const createCanvasContext = () => {
  try {
    return document
      .createElement("canvas")
      .getContext("2d", { willReadFrequently: true });
  } catch {
    return null;
  }
};

const canvasContext = createCanvasContext();

// Slightly modified version of https://github.com/koala-interactive/is-emoji-supported/blob/master/src/is-emoji-supported.ts
const isEmojiSupported = (emoji: string): boolean => {
  const ctx = canvasContext;
  if (!ctx) {
    return false;
  }

  try {
    const CANVAS_HEIGHT = 25;
    const CANVAS_WIDTH = 20;
    const textSize = Math.floor(CANVAS_HEIGHT / 2);

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
    // oxlint-disable-next-line curly
    for (; i < count && !a[i + 3]; i += 4);

    // No visible pixel
    if (i >= count) {
      return false;
    }

    // Emoji has immutable color, so we check the color of the emoji in two different colors
    // the result should be the same.
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

const allowFlagEmoji = isEmojiSupported("🇺🇸");

// An emoji introduced in each Emoji version, newest first.
const EMOJI_VERSIONS = [
  { version: 15, emoji: "\uD83E\uDEE8" },
  { version: 14, emoji: "\uD83E\uDEE0" },
  { version: 13.1, emoji: "\uD83D\uDE36\u200D\uD83C\uDF2B\uFE0F" },
  { version: 13, emoji: "\uD83E\uDD78" },
  { version: 12.1, emoji: "\uD83E\uDDD1\u200D\uD83E\uDDB0" },
  { version: 12, emoji: "\uD83E\uDD71" },
  { version: 11, emoji: "\uD83E\uDD70" },
  { version: 5, emoji: "\uD83E\uDD29" },
  { version: 4, emoji: "\uD83D\uDC71\u200D\u2640\uFE0F" },
  { version: 3, emoji: "\uD83E\uDD23" },
  { version: 2, emoji: "\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8\uFE0F" },
  { version: 1, emoji: "\uD83D\uDE43" },
];

const latestEmojiVersion = EMOJI_VERSIONS.find(({ emoji }) =>
  isEmojiSupported(emoji)
)?.version;

const Emojis = TypedData.emojis;

// Categories without the emoji that this platform cannot render.
const Categories = TypedData.categories
  .filter(({ id }) => allowFlagEmoji || capitalize(id) !== EmojiCategory.Flags)
  .map((category) => ({
    ...category,
    emojis: category.emojis.filter(
      (id) => !latestEmojiVersion || Emojis[id].version <= latestEmojiVersion
    ),
  }));

const searchableEmojiIds = new Set(Categories.flatMap(({ emojis }) => emojis));

const searcher = new FuzzySearch(
  Object.values(Emojis)
    .filter(({ id }) => searchableEmojiIds.has(id))
    .map((emoji) => ({ ...emoji, search: getEmojiSearchString(emoji) })),
  ["search"],
  { caseSensitive: false, sort: true }
);

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
  Categories.reduce(
    (obj, { id, emojis }) => {
      const key = capitalize(id) as EmojiCategory;
      const category = EmojiCategory[key];
      if (!category) {
        return obj;
      }
      obj[category] = emojis;
      return obj;
    },
    {} as Record<EmojiCategory, string[]>
  );

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
  Object.keys(CATEGORY_TO_EMOJI_IDS).reduce(
    (obj, category: EmojiCategory) => {
      const emojiIds = CATEGORY_TO_EMOJI_IDS[category];
      const emojis = emojiIds.map(
        (emojiId) =>
          EMOJI_ID_TO_VARIANTS[emojiId][skinTone] ??
          EMOJI_ID_TO_VARIANTS[emojiId][EmojiSkinTone.Default]
      );
      obj[category] = emojis;
      return obj;
    },
    {} as Record<EmojiCategory, Emoji[]>
  );

export const getEmojiVariants = ({ id }: { id: string }) =>
  EMOJI_ID_TO_VARIANTS[id];

type CustomEmoji = {
  id: string;
  name: string;
  url: string;
};

export const search = ({
  query,
  skinTone,
  customEmojis = [],
}: {
  query: string;
  skinTone?: EmojiSkinTone;
  customEmojis?: CustomEmoji[];
}) => {
  const queryLowercase = query.toLowerCase();
  const emojiSkinTone = skinTone ?? EmojiSkinTone.Default;

  // Search built-in emojis
  const matchedEmojis = searcher
    .search(queryLowercase)
    .map(
      (emoji) =>
        EMOJI_ID_TO_VARIANTS[emoji.id][emojiSkinTone] ??
        EMOJI_ID_TO_VARIANTS[emoji.id][EmojiSkinTone.Default]
    );

  // Search custom emojis
  const matchedCustomEmojis = customEmojis
    .filter((emoji) => {
      const nameLower = emoji.name.toLowerCase();
      const idLower = emoji.id.toLowerCase();
      return (
        nameLower.includes(queryLowercase) || idLower.includes(queryLowercase)
      );
    })
    .map(
      (customEmoji) =>
        ({
          id: customEmoji.id,
          name: customEmoji.name,
          value: customEmoji.id,
        }) as Emoji
    );

  // Combine and sort all results
  const allEmojis = [...matchedEmojis, ...matchedCustomEmojis];

  return sortBy(allEmojis, (emoji) => {
    const nlc = emoji.name.toLowerCase();
    return query === nlc ? -1 : nlc.startsWith(queryLowercase) ? 0 : 1;
  });
};

/**
 * Get an emoji's human-readable ID from its string.
 *
 * @param emoji - The string representation of the emoji.
 * @returns The emoji id, if found.
 */
export const getEmojiId = (emoji: string): string | undefined =>
  searcher.search(emoji)[0]?.id;
