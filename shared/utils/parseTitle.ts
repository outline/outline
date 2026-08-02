import emojiRegex from "emoji-regex";
import { unescape } from "./markdown";

/**
 * Splits a leading emoji from the start of a string.
 *
 * @param text The text to split.
 * @returns The leading emoji, if there is one, and the remaining text.
 */
export function splitLeadingEmoji(text: string): {
  emoji?: string;
  rest: string;
} {
  const matches = emojiRegex().exec(text);
  const firstEmoji = matches ? matches[0] : null;

  if (!firstEmoji || !text.startsWith(firstEmoji)) {
    return { rest: text };
  }

  return {
    emoji: firstEmoji,
    rest: text.slice(firstEmoji.length).trim(),
  };
}

export default function parseTitle(text = "") {
  // find and extract title
  const firstLine = text.trim().split(/\r?\n/)[0];
  const title = unescape(firstLine.replace(/^#/, "").trim());

  // find and extract first emoji
  const { emoji, rest: strippedTitle } = splitLeadingEmoji(title);

  return {
    title,
    emoji,
    strippedTitle,
  };
}
