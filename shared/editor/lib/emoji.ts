import type { EmojiMartData } from "@emoji-mart/data";

export const emojiMartToGemoji: Record<string, string> = {
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
 * Populated lazily on first access to avoid loading @emoji-mart/data in the
 * initial bundle.
 */
export let nameToEmoji: Record<string, string> = {};

let emojiDataLoaded = false;

/**
 * Synchronously populate nameToEmoji from the given emoji data. This mutates
 * the existing object so references captured at init time (e.g. by
 * markdown-it-emoji) are also updated.
 *
 * @param data The emoji mart data to populate from.
 */
export function populateEmojiData(data: EmojiMartData): void {
  if (emojiDataLoaded) {
    return;
  }
  for (const emoji of Object.values(data.emojis)) {
    const convertedId = snakeCase(emoji.id);
    nameToEmoji[emojiMartToGemoji[convertedId] ?? convertedId] =
      emoji.skins[0].native;
  }
  emojiDataLoaded = true;
}

/**
 * Lazily load the emoji data and populate nameToEmoji. Use this on the client
 * to avoid including @emoji-mart/data in the initial bundle.
 *
 * @returns the populated nameToEmoji map.
 */
export async function loadEmojiData(): Promise<Record<string, string>> {
  if (emojiDataLoaded) {
    return nameToEmoji;
  }
  const { default: data } = await import("@emoji-mart/data");
  populateEmojiData(data as EmojiMartData);
  return nameToEmoji;
}

/**
 * Get the emoji character for a given emoji shortcode.
 *
 * @param name The emoji shortcode.
 * @returns the emoji character.
 */
export const getEmojiFromName = (name: string) =>
  nameToEmoji[name.replace(/:/g, "")] ?? "?";

/**
 * Get the emoji shortcode for a given emoji character.
 *
 * @param emoji The emoji character.
 * @returns the emoji shortcode.
 */
export const getNameFromEmoji = (emoji: string) =>
  Object.entries(nameToEmoji).find(([, value]) => value === emoji)?.[0];
