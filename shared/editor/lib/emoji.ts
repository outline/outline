import data, { type EmojiMartData } from "@emoji-mart/data";
import snakeCase from "lodash/snakeCase";

/**
 * A map of emoji shortcode to emoji character. The shortcode is snake cased
 * for backwards compatibility with those already encoded into documents.
 */
export const nameToEmoji = Object.values((data as EmojiMartData).emojis).reduce(
  (acc, emoji) => {
    acc[snakeCase(emoji.id)] = emoji.skins[0].native;
    return acc;
  },
  {}
);
