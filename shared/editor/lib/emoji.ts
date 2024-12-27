import data, { type EmojiMartData } from "@emoji-mart/data";

export const emojiMartToGemoji = {
  "+1": "thumbs_up",
  "-1": "thumbs_down",
};

/**
 * Convert kebab case to snake case.
 *
 * @param str The string to convert
 * @returns The converted string
 */
export const snakeCase = (str: string) => str.replace(/(\w)-(\w)/g, "$1_$2");

/**
 * A map of emoji shortcode to emoji character. The shortcode is snake cased
 * for backwards compatibility with those already encoded into documents.
 */
export const nameToEmoji: Record<string, string> = Object.values(
  (data as EmojiMartData).emojis
).reduce((acc, emoji) => {
  const convertedId = snakeCase(emoji.id);
  // @ts-expect-error emojiMartToGemoji is a valid map
  acc[emojiMartToGemoji[convertedId] ?? convertedId] = emoji.skins[0].native;
  return acc;
}, {});

/**
 * Get the emoji character for a given emoji shortcode.
 *
 * @param name The emoji shortcode
 * @returns The emoji character
 */
export const getEmojiFromName = (name: string) =>
  nameToEmoji[name.replace(/:/g, "")] ?? "?";

/**
 * Get the emoji shortcode for a given emoji character.
 *
 * @param emoji The emoji character
 * @returns The emoji shortcode
 */
export const getNameFromEmoji = (emoji: string) =>
  Object.entries(nameToEmoji).find(([, value]) => value === emoji)?.[0];
