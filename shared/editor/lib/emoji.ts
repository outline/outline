import data, { type EmojiMartData } from "@emoji-mart/data";

const gemojiToEmojiMart = {
  thumbs_up: "+1",
  thumbs_down: "-1",
};

export const snakeCase = (str: string) =>
  str.replace(/(\w)(-)(\w)/g, "$1_$2").toLowerCase();

/**
 * A map of emoji shortcode to emoji character. The shortcode is snake cased
 * for backwards compatibility with those already encoded into documents.
 */
export const nameToEmoji = Object.values((data as EmojiMartData).emojis).reduce(
  (acc, emoji) => {
    const normalizedId = gemojiToEmojiMart[emoji.id] || emoji.id;
    acc[snakeCase(normalizedId)] = emoji.skins[0].native;
    return acc;
  },
  {}
);
