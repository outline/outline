import { isUUID } from "validator";
import type { ProsemirrorData } from "../../types";
import { getEmojiFromName } from "./emoji";

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
