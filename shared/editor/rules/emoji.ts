import MarkdownIt from "markdown-it";
import { full as emojiPlugin } from "markdown-it-emoji";
import { isUUID } from "validator";
import { nameToEmoji } from "../lib/emoji";

type Options = MarkdownIt.Options & {
  emoji: boolean;
};

/**
 * Custom rule to parse UUID-based custom emojis in the format :uuid:
 * This runs before the standard emoji plugin to catch custom emoji patterns.
 */
function customEmojiRule(state: MarkdownIt.StateInline, silent: boolean) {
  const start = state.pos;
  const max = state.posMax;

  // Must start with a colon
  if (state.src.charCodeAt(start) !== 0x3a /* : */) {
    return false;
  }

  // Find the closing colon
  let pos = start + 1;
  while (pos < max && state.src.charCodeAt(pos) !== 0x3a /* : */) {
    pos++;
  }

  // No closing colon found
  if (pos >= max) {
    return false;
  }

  // Extract the content between colons
  const content = state.src.slice(start + 1, pos);

  // Check if it's a UUID
  if (!isUUID(content)) {
    return false;
  }

  // If we're in silent mode (checking if rule matches), just return true
  if (!silent) {
    const token = state.push("emoji", "", 0);
    token.markup = content;
    token.content = content;
  }

  state.pos = pos + 1;
  return true;
}

export default function emoji(md: MarkdownIt) {
  // Ideally this would be an empty object, but due to a bug in markdown-it-emoji
  // passing an empty object results in newlines becoming emojis. Until this is
  // fixed at least one key is required. See:
  // https://github.com/markdown-it/markdown-it-emoji/issues/46
  const noMapping = {
    no_name_mapping: "💯",
  };

  // Apply the standard emoji plugin first
  emojiPlugin(md, {
    defs: (md.options as Options).emoji === false ? noMapping : nameToEmoji,
    shortcuts: {},
  });

  // Add custom rule for UUID-based custom emojis
  // This should run before the emoji plugin's rule to catch UUIDs first
  md.inline.ruler.before("emoji", "custom_emoji", customEmojiRule);

  return md;
}
