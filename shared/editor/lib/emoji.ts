import type { EmojiMartData } from "@emoji-mart/data";
import { isUUID } from "validator";
import type { ProsemirrorData } from "../../types";

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

/**
 * Resolve an emoji node name to the value used to react with.
 *
 * @param name The emoji shortcode, or a UUID for a custom emoji.
 * @returns the native emoji character, the UUID of a custom emoji, or undefined
 * when the name does not resolve to a known emoji.
 */
function getReactionFromName(name: unknown): string | undefined {
  if (typeof name !== "string") {
    return undefined;
  }

  // Custom emojis are stored as UUIDs and reacted with directly.
  if (isUUID(name)) {
    return name;
  }

  const character = getEmojiFromName(name);
  return character === "?" ? undefined : character;
}

/**
 * Detect the "+:emoji:" reaction shorthand within a comment's document. When a
 * comment consists solely of a leading "+" immediately followed by a single
 * emoji it is treated as a request to react to the comment above rather than as
 * a new comment, mirroring the Slack shorthand.
 *
 * @param data The Prosemirror document of the draft comment.
 * @returns the emoji to react with — a native emoji character, or a UUID for a
 * custom emoji — or undefined when the document is not a reaction shorthand.
 */
export function parseReactionShorthand(
  data: ProsemirrorData
): string | undefined {
  const blocks = data.content ?? [];
  if (blocks.length !== 1) {
    return undefined;
  }

  const paragraph = blocks[0];
  if (paragraph.type !== "paragraph") {
    return undefined;
  }

  // Ignore whitespace-only text nodes so that "+ :emoji:" still matches.
  const inline = (paragraph.content ?? []).filter(
    (node) => !(node.type === "text" && !node.text?.trim())
  );

  // The common case: a "+" text node followed by an emoji node inserted via
  // the emoji menu.
  if (inline.length === 2) {
    const [prefix, emoji] = inline;
    if (
      prefix.type === "text" &&
      prefix.text?.trim() === "+" &&
      emoji.type === "emoji"
    ) {
      return getReactionFromName(emoji.attrs?.["data-name"]);
    }
    return undefined;
  }

  // Fallback: literal "+:shortcode:" text that was never converted to a node.
  if (inline.length === 1 && inline[0].type === "text") {
    const match = inline[0].text?.trim().match(/^\+\s*:([\w-]+):$/);
    if (match) {
      return getReactionFromName(match[1]);
    }
  }

  return undefined;
}
