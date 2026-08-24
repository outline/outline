import type { EmojiMartData, Skin } from "@emoji-mart/data";
import FuzzySearch from "fuzzy-search";
import { capitalize, compact, sortBy } from "es-toolkit/compat";
import { loadEmojiData } from "../editor/lib/emoji";
import type { Emoji, EmojiVariants } from "../types";
import { EmojiCategory, EmojiSkinTone } from "../types";

/** An emoji record with the search terms emoji-mart adds during init. */
type IndexedEmoji = EmojiMartData["emojis"][string];

interface EmojiIndex {
  /** Fuzzy searcher over the pre-processed emoji-mart search terms. */
  searcher: FuzzySearch<IndexedEmoji>;
  /** Skin tone variants of every emoji, keyed by emoji id. */
  variantsById: Record<string, EmojiVariants>;
  /** Emoji ids in each category, in display order. */
  idsByCategory: Record<EmojiCategory, string[]>;
  /** Emoji id for every native character, including skin tone variants. */
  idByNative: Record<string, string>;
  /** Cache of getEmojisWithCategory results, which are immutable per tone. */
  emojisByCategory: Map<EmojiSkinTone, Record<EmojiCategory, Emoji[]>>;
}

let index: EmojiIndex | undefined;
let loading: Promise<void> | undefined;

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

    // Initialize canvas context
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

const buildIndex = (data: EmojiMartData): EmojiIndex => {
  let categories = data.categories;
  let emojis = data.emojis;

  if (!isFlagEmojiSupported()) {
    const isFlagCategory = ({ id }: { id: string }) =>
      capitalize(id) === EmojiCategory.Flags;
    const flagEmojiIds = new Set(categories.find(isFlagCategory)?.emojis ?? []);
    categories = categories.filter((category) => !isFlagCategory(category));
    emojis = Object.fromEntries(
      Object.entries(emojis).filter(([id]) => !flagEmojiIds.has(id))
    );
  }

  const variantsById: Record<string, EmojiVariants> = {};
  const idByNative: Record<string, string> = {};
  for (const [id, emoji] of Object.entries(emojis)) {
    variantsById[id] = getVariants({
      id,
      name: emoji.name,
      skins: emoji.skins,
    });
    for (const skin of emoji.skins) {
      idByNative[skin.native] = id;
    }
  }

  const idsByCategory = categories.reduce(
    (obj, { id, emojis: emojiIds }) => {
      const key = capitalize(id) as EmojiCategory;
      const category = EmojiCategory[key];
      if (!category) {
        return obj;
      }
      obj[category] = emojiIds;
      return obj;
    },
    {} as Record<EmojiCategory, string[]>
  );

  return {
    // Both the pre-processed search terms and the queries are lowercase, so
    // skip the per-item lowercasing a case-insensitive search would do.
    searcher: new FuzzySearch(Object.values(emojis), ["search"], {
      caseSensitive: true,
      sort: true,
    }),
    variantsById,
    idsByCategory,
    idByNative,
    emojisByCategory: new Map(),
  };
};

const variantForSkinTone = (
  id: string,
  skinTone: EmojiSkinTone
): Emoji | undefined => {
  const variants = index?.variantsById[id];
  return variants?.[skinTone] ?? variants?.[EmojiSkinTone.Default];
};

/**
 * Load the emoji dataset and build the search index. The dataset is large, so it
 * is fetched on demand rather than included in the initial bundle. Until it
 * resolves the accessors in this module behave as if no emoji exist.
 *
 * @returns a promise that resolves once emoji search and categories are ready.
 */
export function loadEmojiIndex(): Promise<void> {
  loading ??= (async () => {
    const [data, emojiMart] = await Promise.all([
      loadEmojiData(),
      // oxlint-disable-next-line no-restricted-imports
      import("emoji-mart"),
    ]);
    await emojiMart.init({ data });
    // Read through the namespace, as Data is only assigned during init. It has
    // the pre-processed "search" terms the raw dataset lacks.
    index = buildIndex(emojiMart.Data as EmojiMartData);
  })();

  return loading;
}

/**
 * Whether the emoji dataset has finished loading.
 *
 * @returns true once emoji search and categories are available.
 */
export const isEmojiIndexLoaded = (): boolean => index !== undefined;

/**
 * Get the emoji for each of the given ids in a particular skin tone.
 *
 * @param ids The emoji ids to look up.
 * @param skinTone The preferred skin tone, falling back to the default.
 * @returns the matching emoji, omitting any id that is not recognized.
 */
export const getEmojis = ({
  ids,
  skinTone,
}: {
  ids: string[];
  skinTone: EmojiSkinTone;
}): Emoji[] => compact(ids.map((id) => variantForSkinTone(id, skinTone)));

/**
 * Get every emoji grouped by the category it belongs to.
 *
 * @param skinTone The preferred skin tone, falling back to the default.
 * @returns the emoji in each category, empty until the dataset has loaded.
 */
export const getEmojisWithCategory = ({
  skinTone,
}: {
  skinTone: EmojiSkinTone;
}): Record<EmojiCategory, Emoji[]> => {
  if (!index) {
    return {} as Record<EmojiCategory, Emoji[]>;
  }
  let emojis = index.emojisByCategory.get(skinTone);
  if (!emojis) {
    emojis = Object.fromEntries(
      Object.entries(index.idsByCategory).map(([category, ids]) => [
        category,
        getEmojis({ ids, skinTone }),
      ])
    ) as Record<EmojiCategory, Emoji[]>;
    index.emojisByCategory.set(skinTone, emojis);
  }
  return emojis;
};

/**
 * Get the skin tone variants of a single emoji.
 *
 * @param id The emoji id.
 * @returns the variants, or undefined if the emoji is unknown.
 */
export const getEmojiVariants = ({ id }: { id: string }) =>
  index?.variantsById[id];

type CustomEmoji = {
  id: string;
  name: string;
  url: string;
};

/**
 * Search the built-in and custom emoji by name.
 *
 * @param query The search query.
 * @param skinTone The preferred skin tone, falling back to the default.
 * @param customEmojis The team's custom emoji to include in the results.
 * @returns the matching emoji, best match first.
 */
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
  const matchedEmojis = getEmojis({
    ids: index?.searcher.search(queryLowercase).map(({ id }) => id) ?? [],
    skinTone: emojiSkinTone,
  });

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
 * Get an emoji's human-readable ID from its native character.
 *
 * @param emoji - The string representation of the emoji.
 * @returns The emoji id, if found.
 */
export const getEmojiId = (emoji: string): string | undefined =>
  index?.idByNative[emoji];
